using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using Azure.AI.OpenAI;
using BlotzTask.Extension;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.MonthlyReviews.Domain;
using BlotzTask.Modules.MonthlyReviews.Dtos;
using BlotzTask.Modules.MonthlyReviews.Prompts;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using OpenAI.Chat;

namespace BlotzTask.Modules.MonthlyReviews.Commands;

public class GenerateMonthlyReviewRequest
{
    [BindRequired, Range(2000, 9999)] public int Year { get; set; }
    [BindRequired, Range(1, 12)] public int Month { get; set; }
}

public class GenerateMonthlyReviewCommand
{
    [Required] public required Guid UserId { get; init; }
    [Range(2000, 9999)] public required int Year { get; init; }
    [Range(1, 12)] public required int Month { get; init; }
}

public class GenerateMonthlyReviewCommandHandler(
    BlotzTaskDbContext db,
    AzureOpenAIClient azureOpenAIClient,
    AgentFrameworkServiceExtensions.AzureAIOptions aiOptions,
    ILogger<GenerateMonthlyReviewCommandHandler> logger)
{
    // TODO: Reusing the Breakdown deployment for v1. ReasoningEffortLevel is only honoured on
    // o-series reasoning models — if Breakdown points at a non-reasoning model (e.g. GPT-4o),
    // the option is ignored. Revisit once we decide whether monthly review needs its own
    // deployment (likely a reasoning model for better reflection quality).
    private readonly string _deploymentId = aiOptions.BreakdownDeploymentId;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<MonthlyReviewDto> Handle(
        GenerateMonthlyReviewCommand command,
        CancellationToken ct = default)
    {
        //TODO: Need to think how we want to handle duplicate reports. If we already have one and still trigger what should we do?
        var existingReport = await db.MonthlyReviewReports
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.UserId == command.UserId
                     && r.Year == command.Year
                     && r.Month == command.Month,
                ct);

        if (existingReport is not null)
        {
            logger.LogInformation(
                "Returning existing monthly review for user {UserId} ({Year}-{Month:D2})",
                command.UserId, command.Year, command.Month);

            return new MonthlyReviewDto
            {
                Year = existingReport.Year,
                Month = existingReport.Month,
                AiGeneratedLetter = existingReport.AiGeneratedLetter,
                CreatedAt = existingReport.CreatedAt,
            };
        }

        // TODO: v1 uses a UTC month boundary. Tasks created within ~12h of a month edge in the
        // user's local timezone will bucket into the wrong UTC month. Fix once UserPreference
        // stores a TimeZoneId (mobile reports latest-known TZ on sync, scheduler reads it).
        var monthStartUtc = new DateTime(command.Year, command.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStartUtc = monthStartUtc.AddMonths(1);

        var monthlyTasks = await LoadMonthlyTasksAsync(command.UserId, monthStartUtc, nextMonthStartUtc, ct);
        var aiInputJson = JsonSerializer.Serialize(monthlyTasks, JsonOptions);

        var preferredLanguage = await LoadPreferredLanguageAsync(command.UserId, ct);

        var (letter, model) = await GenerateLetterAsync(
            preferredLanguage.ToDisplayName(),
            monthStartUtc.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            aiInputJson,
            ct);

        var report = new MonthlyReviewReport
        {
            UserId = command.UserId,
            Year = command.Year,
            Month = command.Month,
            AiGeneratedLetter = letter,
            AiInputJson = aiInputJson,
            AiModel = model,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.MonthlyReviewReports.Add(report);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Saved monthly review {ReportId} for user {UserId} ({Year}-{Month:D2})",
            report.Id, command.UserId, command.Year, command.Month);

        return new MonthlyReviewDto
        {
            Year = report.Year,
            Month = report.Month,
            AiGeneratedLetter = report.AiGeneratedLetter,
            CreatedAt = report.CreatedAt,
        };
    }

    private Task<List<MonthlyReviewTaskDto>> LoadMonthlyTasksAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime nextMonthStartUtc,
        CancellationToken ct)
    {
        return db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == userId
                        && t.CreatedAt >= monthStartUtc
                        && t.CreatedAt < nextMonthStartUtc)
            .OrderBy(t => t.CreatedAt)
            .Select(t => new MonthlyReviewTaskDto
            {
                Title = t.Title,
                Details = t.Description ?? string.Empty,
                CreatedDate = t.CreatedAt,
                PlannedDate = t.StartTime,
                TimeTakenMinutes = (int)(t.EndTime - t.StartTime).TotalMinutes,
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

    private async Task<(string Letter, string Model)> GenerateLetterAsync(
        string preferredLanguage,
        string displayMonth,
        string aiInputJson,
        CancellationToken ct)
    {
        var prompt = MonthlyReviewPrompts.GetMonthlyReviewPrompt(preferredLanguage, displayMonth, aiInputJson);
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
                "Generating monthly review letter (deployment={DeploymentId}, language={Language}, month={Month})",
                _deploymentId, preferredLanguage, displayMonth);

            var response = await chatClient.CompleteChatAsync(
                new ChatMessage[] { new UserChatMessage(prompt) },
                options,
                ct);

            var letter = response.Value.Content.Count > 0
                ? response.Value.Content[0].Text ?? string.Empty
                : string.Empty;

            if (string.IsNullOrWhiteSpace(letter))
            {
                logger.LogWarning("AI returned empty letter for monthly review (deployment={DeploymentId})", _deploymentId);
                throw new AiTaskGenerationException(
                    AiErrorCode.EmptyResponse,
                    "AI returned an empty monthly review letter.");
            }

            logger.LogInformation(
                "Monthly review generated (deployment={DeploymentId}, length={Length})",
                _deploymentId, letter.Length);

            return (letter, _deploymentId);
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Monthly review generation canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        //TODO : Handle this more gracefully once the error updated pr merge
        catch (Exception ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Token / rate limit hit while generating monthly review");
            throw new AzureAiException();
        }
        catch (Exception ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Content filter blocked monthly review generation");
            throw new AiContentFilterException();
        }
        catch (AiTaskGenerationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unexpected error while generating monthly review");
            throw new AiTaskGenerationException(
                AiErrorCode.Unknown,
                "An unhandled exception occurred during monthly review generation.",
                ex);
        }
    }
}
