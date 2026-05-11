using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.MonthlyReviews.Domain;
using BlotzTask.Modules.MonthlyReviews.Dtos;
using BlotzTask.Modules.MonthlyReviews.Services;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.MonthlyReviews.Commands;

public class GenerateMonthlyReviewCommand
{
    [Required] public required Guid UserId { get; init; }
    [Range(2000, 9999)] public required int Year { get; init; }
    [Range(1, 12)] public required int Month { get; init; }
}

public class GenerateMonthlyReviewCommandHandler(
    BlotzTaskDbContext db,
    IMonthlyReviewAiService aiService,
    ILogger<GenerateMonthlyReviewCommandHandler> logger)
{
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

        var monthlyTasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == command.UserId
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

        var aiInputJson = JsonSerializer.Serialize(monthlyTasks, JsonOptions);

        var preferredLanguage = await db.UserPreferences
            .AsNoTracking()
            .Where(p => p.UserId == command.UserId)
            .Select(p => p.PreferredLanguage)
            .FirstOrDefaultAsync(ct);

        var aiResult = await aiService.GenerateLetterAsync(
            preferredLanguage.ToDisplayName(),
            monthStartUtc.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            aiInputJson,
            ct);

        var report = new MonthlyReviewReport
        {
            UserId = command.UserId,
            Year = command.Year,
            Month = command.Month,
            AiGeneratedLetter = aiResult.AiGeneratedLetter,
            AiInputJson = aiInputJson,
            AiModel = aiResult.AiModel,
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
}
