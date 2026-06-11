using System.ClientModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Azure.AI.OpenAI;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.Reviews.Domain;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Enums;
using BlotzTask.Modules.Reviews.Prompts;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using OpenAI.Chat;

namespace BlotzTask.Modules.Reviews.Commands;

public class GenerateReviewRequest
{
    [BindRequired] public ReviewPeriodType PeriodType { get; set; }
    [BindRequired] public DateTimeOffset PeriodStartUtc { get; set; }
}

public class GenerateReviewCommand
{
    [Required] public required Guid UserId { get; init; }
    public required ReviewPeriodType PeriodType { get; init; }
    public required DateTimeOffset PeriodStartUtc { get; init; }
}

public class GenerateReviewCommandHandler(
    BlotzTaskDbContext db,
    AzureOpenAIClient azureOpenAIClient,
    AgentFrameworkServiceExtensions.AzureAIOptions aiOptions,
    ICheckAiQuotaService checkAiQuotaService,
    IRecordAiUsageService recordAiUsageService,
    ILogger<GenerateReviewCommandHandler> logger)
{
    // TODO: Reusing the Breakdown deployment for v1. ReasoningEffortLevel is only honoured on
    // o-series reasoning models — if Breakdown points at a non-reasoning model (e.g. GPT-4o),
    // the option is ignored. Revisit once we decide whether review needs its own
    // deployment (likely a reasoning model for better reflection quality).
    private readonly string _deploymentId = aiOptions.BreakdownDeploymentId;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<ReviewReportDto> Handle(
        GenerateReviewCommand command,
        CancellationToken ct = default)
    {
        // Validate alignment + derive bounds on the server (throws 400 on a bad start).
        var period = ReviewPeriod.Create(command.PeriodType, command.PeriodStartUtc);
        var threshold = ReviewConstants.LowActivityTaskThreshold(period.PeriodType);

        //TODO: Need to think how we want to handle duplicate reports. If we already have one and still trigger what should we do?
        var existingReport = await db.ReviewReports
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.UserId == command.UserId
                     && r.PeriodType == period.PeriodType
                     && r.PeriodStartUtc == period.StartUtc,
                ct);

        if (existingReport is not null)
        {
            logger.LogInformation(
                "Returning existing {PeriodType} review for user {UserId} (start {PeriodStartUtc:o})",
                period.PeriodType, command.UserId, period.StartUtc);

            return ToDto(existingReport, existingReport.AiInputTaskCount, threshold);
        }

        // A review is a period-end summary, so it is only available once the period has fully
        // ended (defence-in-depth — the app shouldn't offer the current/future period).
        // Period bounds carry the user's offset, so this gate is correct for their local week/month.
        // TODO: a week/month spanning a DST change can be off by an hour — fix once UserPreference
        // stores a TimeZoneId (mobile reports latest-known TZ on sync, scheduler reads it).
        if (!period.HasEnded(DateTimeOffset.UtcNow))
            throw new ArgumentException("A review is only available after the period has ended.");

        var tasks = await LoadTasksForPeriodAsync(command.UserId, period.StartUtc, period.EndUtc, ct);
        var aiInputJson = JsonSerializer.Serialize(tasks, JsonOptions);

        var preferredLanguage = await LoadPreferredLanguageAsync(command.UserId, ct);
        await checkAiQuotaService.CheckQuotaAsync(command.UserId, ct);

        var (letter, model, usage) = await GenerateLetterAsync(
            period.PeriodType,
            preferredLanguage.ToDisplayName(),
            period.ToDisplayLabel(),
            aiInputJson,
            ct);

        await recordAiUsageService.RecordAiUsageAsync(new RecordAiUsageRequest
        {
            UserId = command.UserId,
            InputTokens = usage?.InputTokenCount ?? 0,
            OutputTokens = usage?.OutputTokenCount ?? 0,
            TotalTokens = usage?.TotalTokenCount ?? 0,
        }, ct);

        var report = new ReviewReport
        {
            UserId = command.UserId,
            PeriodType = period.PeriodType,
            PeriodStartUtc = period.StartUtc,
            PeriodEndUtc = period.EndUtc,
            AiGeneratedLetter = letter,
            AiInputJson = aiInputJson,
            AiInputTaskCount = tasks.Count,
            AiModel = model,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.ReviewReports.Add(report);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Saved {PeriodType} review {ReportId} for user {UserId} (start {PeriodStartUtc:o})",
            period.PeriodType, report.Id, command.UserId, period.StartUtc);

        return ToDto(report, tasks.Count, threshold);
    }

    private static ReviewReportDto ToDto(ReviewReport report, int? taskCount, int lowActivityThreshold) =>
        new()
        {
            PeriodType = report.PeriodType,
            PeriodStartUtc = report.PeriodStartUtc,
            PeriodEndUtc = report.PeriodEndUtc,
            AiGeneratedLetter = report.AiGeneratedLetter,
            CreatedAt = report.CreatedAt,
            IsLowActivity = taskCount != null && taskCount < lowActivityThreshold,
        };

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

    private Task<Language> LoadPreferredLanguageAsync(Guid userId, CancellationToken ct)
    {
        return db.UserPreferences
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.PreferredLanguage)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<(string Letter, string Model, ChatTokenUsage? Usage)> GenerateLetterAsync(
        ReviewPeriodType periodType,
        string preferredLanguage,
        string displayPeriodLabel,
        string aiInputJson,
        CancellationToken ct)
    {
        var prompt = ReviewPrompts.GetReviewPrompt(periodType, preferredLanguage, displayPeriodLabel, aiInputJson);
        var chatClient = azureOpenAIClient.GetChatClient(_deploymentId);

#pragma warning disable OPENAI001 // ReasoningEffortLevel is experimental in Azure.AI.OpenAI 2.8.0-beta.
        var options = new ChatCompletionOptions
        {
            ReasoningEffortLevel = ChatReasoningEffortLevel.Medium
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

            var letter = response.Value.Content.Count > 0
                ? response.Value.Content[0].Text ?? string.Empty
                : string.Empty;

            if (string.IsNullOrWhiteSpace(letter))
            {
                logger.LogWarning("AI returned empty letter for review (deployment={DeploymentId})", _deploymentId);
                throw new AiTaskGenerationException(
                    AiErrorCode.EmptyResponse,
                    "AI returned an empty review letter.");
            }

            logger.LogInformation(
                "Review generated (deployment={DeploymentId}, length={Length})",
                _deploymentId, letter.Length);

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
