using System.ClientModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Azure.AI.OpenAI;
using BlotzTask.Extension.Options;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.Reviews.Domain;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Enums;
using BlotzTask.Modules.Reviews.Prompts;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OpenAI.Chat;

namespace BlotzTask.Modules.Reviews.Commands;

public class GenerateReviewRequest
{
    [Required] public ReviewPeriodType PeriodType { get; set; }
    [Required] public DateOnly AnchorDate { get; set; }
    public string? TimeZoneId { get; set; }
}

public class GenerateReviewCommand
{
    [Required] public required Guid UserId { get; init; }
    public required ReviewPeriodType PeriodType { get; init; }
    public required DateOnly AnchorDate { get; init; }
    public string? TimeZoneId { get; init; }
}

public class GenerateReviewCommandHandler(
    BlotzTaskDbContext db,
    AzureOpenAIClient azureOpenAIClient,
    IOptions<AzureOpenAIOptions> aiOptions,
    ICheckAiQuotaService checkAiQuotaService,
    IRecordAiUsageService recordAiUsageService,
    ILogger<GenerateReviewCommandHandler> logger)
{
    // TODO: Reusing the Breakdown deployment for v1, which currently resolves to gpt-5.4-mini —
    // a reasoning model, so ReasoningEffortLevel below is honoured. Revisit if review ever needs
    // its own deployment; it shares capacity with task generation, breakdown and time estimation.
    private readonly string _deploymentId = aiOptions.Value.AiModels.Breakdown.DeploymentId;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<ReviewReportDto> Handle(
        GenerateReviewCommand command,
        CancellationToken ct = default)
    {
        // Resolve the timezone, then snap the anchor date to the canonical period (server is the
        // single source of truth — a non-Monday / non-1st anchor is canonicalized, not rejected).
        var timeZone = ReviewTimeZone.Resolve(command.TimeZoneId);
        var period = ReviewPeriod.CreateFromAnchor(command.PeriodType, command.AnchorDate, timeZone);
        var threshold = ReviewConstants.LowActivityTaskThreshold(period.PeriodType);

        //TODO: Need to think how we want to handle duplicate reports. If we already have one and still trigger what should we do?
        var existingReport = await db.ReviewReports
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.UserId == command.UserId
                     && r.PeriodType == period.PeriodType
                     && r.PeriodStartUtc == period.StartUtc,
                ct);

        ReviewReport report;

        if (existingReport is not null)
        {
            logger.LogInformation(
                "Returning existing {PeriodType} review for user {UserId} ({StartLocal}, {TimeZoneId})",
                period.PeriodType, command.UserId, period.StartLocalDate, period.TimeZoneId);

            report = existingReport;
        }
        else
        {
            // A review is a period-end summary, so it is only available once the period has fully ended
            // (defence-in-depth — the app shouldn't offer the current/future period).
            if (!period.HasEnded(DateTimeOffset.UtcNow))
                throw new ArgumentException("A review is only available after the period has ended.");

            var tasks = await LoadTasksForPeriodAsync(command.UserId, period.StartUtc, period.EndUtc, ct);
            var aiInputJson = JsonSerializer.Serialize(tasks, JsonOptions);

            var preferredLanguage = await LoadPreferredLanguageAsync(command.UserId, ct);
            var recentThemes = await LoadRecentThemesAsync(command.UserId, period, ct);
            await checkAiQuotaService.CheckQuotaAsync(command.UserId, ct);

            var (letter, model, usage) = await GenerateLetterAsync(
                period.PeriodType,
                preferredLanguage.ToDisplayName(),
                period.ToDisplayLabel(),
                aiInputJson,
                recentThemes,
                ct);

            await recordAiUsageService.RecordAiUsageAsync(new RecordAiUsageRequest
            {
                UserId = command.UserId,
                InputTokens = usage?.InputTokenCount ?? 0,
                OutputTokens = usage?.OutputTokenCount ?? 0,
                TotalTokens = usage?.TotalTokenCount ?? 0,
            }, ct);

            var newReport = new ReviewReport
            {
                UserId = command.UserId,
                PeriodType = period.PeriodType,
                PeriodStartUtc = period.StartUtc,
                PeriodEndUtc = period.EndUtc,
                AiGeneratedLetter = letter.Body,
                Theme = letter.Theme,
                OneThingToTryNext = letter.OneThingToTryNext,
                AiInputJson = aiInputJson,
                AiInputTaskCount = tasks.Count,
                AiModel = model,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            db.ReviewReports.Add(newReport);
            try
            {
                await db.SaveChangesAsync(ct);

                logger.LogInformation(
                    "Saved {PeriodType} review {ReportId} for user {UserId} ({StartLocal}, {TimeZoneId})",
                    period.PeriodType, newReport.Id, command.UserId, period.StartLocalDate, period.TimeZoneId);

                report = newReport;
            }
            catch (DbUpdateException)
            {
                // Concurrency guard: two simultaneous requests can both pass the existence check above
                // and generate, but the unique index (UserId, PeriodType, PeriodStartUtc) lets only one
                // insert win. Rather than surface a 500 to the loser, detach our rejected row and return
                // the winner's report. (We accept the rare duplicate AI call — it's cheap.)
                db.Entry(newReport).State = EntityState.Detached;

                var winningReport = await db.ReviewReports
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        r => r.UserId == command.UserId
                             && r.PeriodType == period.PeriodType
                             && r.PeriodStartUtc == period.StartUtc,
                        ct);

                if (winningReport is null) throw;

                logger.LogInformation(
                    "Concurrent {PeriodType} review insert for user {UserId} lost the race; returning the existing report",
                    period.PeriodType, command.UserId);

                report = winningReport;
            }
        }

        // The task set loaded for the AI above is wider (planned OR completed in the period), so it
        // cannot be reused for this count.
        var tasksCompleted = await db.TaskItems
            .AsNoTracking()
            .CountAsync(
                t => t.UserId == command.UserId
                     && t.CompletedAt != null
                     && t.CompletedAt >= period.StartUtc
                     && t.CompletedAt < period.EndUtc,
                ct);

        // Activity rows hold the user's local date, so the local bounds apply directly.
        int? daysActive = period.ReportsDaysActive
            ? await db.UserActivityDays
                .AsNoTracking()
                .CountAsync(
                    a => a.UserId == command.UserId
                         && a.LocalDate >= period.StartLocalDate
                         && a.LocalDate < period.EndLocalDateExclusive,
                    ct)
            : null;

        return new ReviewReportDto
        {
            PeriodType = period.PeriodType,
            PeriodStartLocal = period.StartLocalDate,
            PeriodEndLocalExclusive = period.EndLocalDateExclusive,
            TasksCompleted = tasksCompleted,
            DaysActive = daysActive,
            Letter = report.AiGeneratedLetter,
            Theme = report.Theme,
            OneThingToTryNext = report.OneThingToTryNext,
            GeneratedAtUtc = DateTime.SpecifyKind(report.CreatedAt, DateTimeKind.Utc),
            IsLowActivity = report.AiInputTaskCount != null && report.AiInputTaskCount < threshold,
        };
    }

    private Task<List<ReviewTaskDto>> LoadTasksForPeriodAsync(
        Guid userId,
        DateTimeOffset periodStart,
        DateTimeOffset periodEnd,
        CancellationToken ct)
    {
        return db.TaskItems
            .AsNoTracking()
            // Include tasks that were planned in the period or completed in the period. Half-open [start, end).
            .Where(t => t.UserId == userId
                        && ((t.StartTime >= periodStart && t.StartTime < periodEnd)
                            || (t.CompletedAt != null
                                && t.CompletedAt >= periodStart
                                && t.CompletedAt < periodEnd)))
            .OrderBy(t => t.StartTime)
            .Select(t => new ReviewTaskDto
            {
                Title = t.Title,
                Details = t.Description ?? string.Empty,
                CreatedDate = t.CreatedAt,
                PlannedDate = t.StartTime,
                CompletedDate = t.CompletedAt,
                PlannedDurationMinutes = (int)(t.EndTime - t.StartTime).TotalMinutes,
                IsDone = t.IsDone,
            })
            .ToListAsync(ct);
    }

    private async Task<List<string>> LoadRecentThemesAsync(
        Guid userId,
        ReviewPeriod period,
        CancellationToken ct)
    {
        return await db.ReviewReports
            .AsNoTracking()
            .Where(r => r.UserId == userId
                        && r.PeriodType == period.PeriodType
                        && r.PeriodStartUtc < period.StartUtc
                        && r.Theme != null)
            .OrderByDescending(r => r.PeriodStartUtc)
            .Take(ReviewConstants.RecentThemesToAvoid)
            .Select(r => r.Theme!)
            .ToListAsync(ct);
    }

    private Task<Language> LoadPreferredLanguageAsync(Guid userId, CancellationToken ct)
    {
        return db.UserPreferences
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.PreferredLanguage)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<(ReviewLetter Letter, string Model, ChatTokenUsage? Usage)> GenerateLetterAsync(
        ReviewPeriodType periodType,
        string preferredLanguage,
        string displayPeriodLabel,
        string aiInputJson,
        IReadOnlyCollection<string> recentThemes,
        CancellationToken ct)
    {
        var prompt = ReviewPrompts.GetReviewPrompt(
            periodType, preferredLanguage, displayPeriodLabel, aiInputJson, recentThemes);
        var chatClient = azureOpenAIClient.GetChatClient(_deploymentId);

#pragma warning disable OPENAI001 // ReasoningEffortLevel is experimental in Azure.AI.OpenAI 2.8.0-beta.
        var options = new ChatCompletionOptions
        {
            ReasoningEffortLevel = ChatReasoningEffortLevel.Medium,
            // Pin the model to the letter's shape. A response that still comes back unusable (cut off,
            // filtered, or unparseable) is rejected below rather than saved.
            ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                jsonSchemaFormatName: ReviewPrompts.ReviewLetterSchemaName,
                jsonSchema: ReviewPrompts.ReviewLetterSchema,
                jsonSchemaIsStrict: true),
        };
#pragma warning restore OPENAI001

        try
        {
            logger.LogInformation(
                "Generating {PeriodType} review letter (deployment={DeploymentId}, language={Language}, period={Period})",
                periodType, _deploymentId, preferredLanguage, displayPeriodLabel);

            var response = await chatClient.CompleteChatAsync(
                new ChatMessage[] { new UserChatMessage(prompt) },
                options,
                ct);

            // Length and ContentFilter come back as HTTP 200 with half a JSON object. Saving that would
            // pin the broken letter to the period forever, so fail and let the user retry instead.
            if (response.Value.FinishReason != ChatFinishReason.Stop)
            {
                logger.LogWarning(
                    "Review letter stopped early (finishReason={FinishReason}, deployment={DeploymentId})",
                    response.Value.FinishReason, _deploymentId);
                throw new AiTaskGenerationException(
                    AiErrorCode.EmptyResponse,
                    $"Review letter generation stopped early ({response.Value.FinishReason}).");
            }

            var rawResponse = response.Value.Content.Count > 0
                ? response.Value.Content[0].Text ?? string.Empty
                : string.Empty;

            if (string.IsNullOrWhiteSpace(rawResponse))
            {
                logger.LogWarning("AI returned empty letter for review (deployment={DeploymentId})", _deploymentId);
                throw new AiTaskGenerationException(
                    AiErrorCode.EmptyResponse,
                    "AI returned an empty review letter.");
            }

            var letter = ReviewLetterParser.Parse(rawResponse);

            if (letter is null)
            {
                logger.LogWarning(
                    "AI returned an unparseable review letter (deployment={DeploymentId}, length={Length})",
                    _deploymentId, rawResponse.Length);
                throw new AiTaskGenerationException(
                    AiErrorCode.EmptyResponse,
                    "AI returned a review letter that does not match the schema.");
            }

            if (letter.Theme is null)
            {
                // Expected for a quiet period.
                logger.LogInformation(
                    "Review letter has no theme (deployment={DeploymentId}, periodType={PeriodType})",
                    _deploymentId, periodType);
            }

            logger.LogInformation(
                "Review generated (deployment={DeploymentId}, length={Length})",
                _deploymentId, letter.Body.Length);

            return (letter, _deploymentId, response.Value.Usage);
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Review generation canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (ClientResultException ex) when (ex.Status == 429)
        {
            logger.LogError(ex, "Azure AI rate limit hit while generating review.");
            throw new AzureAiException();
        }
        catch (ClientResultException ex) when (
            ex.Status == 400 &&
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Content filter blocked review generation.");
            throw new AiContentFilterException();
        }
        catch (AiTaskGenerationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unexpected error while generating review");
            throw new AiTaskGenerationException(
                AiErrorCode.Unknown,
                "An unhandled exception occurred during review generation.",
                ex);
        }
    }
}
