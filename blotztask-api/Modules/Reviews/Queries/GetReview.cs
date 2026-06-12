using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Reviews.Domain;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Enums;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Reviews.Queries;

public class GetReviewRequest
{
    [BindRequired] public ReviewPeriodType PeriodType { get; set; }
    [BindRequired] public DateOnly AnchorDate { get; set; }
    public string? TimeZoneId { get; set; }
}

public class GetReviewQuery
{
    [Required] public required Guid UserId { get; init; }
    public required ReviewPeriodType PeriodType { get; init; }
    public required DateOnly AnchorDate { get; init; }
    public string? TimeZoneId { get; init; }
}

public class GetReviewQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetReviewQueryHandler> logger)
{
    public async Task<ReviewReportDto> Handle(
        GetReviewQuery query,
        CancellationToken ct = default)
    {
        var timeZone = ReviewTimeZone.Resolve(query.TimeZoneId);
        var period = ReviewPeriod.CreateFromAnchor(query.PeriodType, query.AnchorDate, timeZone);

        logger.LogInformation(
            "Fetching saved {PeriodType} review for user {UserId} ({StartLocal}, {TimeZoneId})",
            period.PeriodType, query.UserId, period.StartLocalDate, period.TimeZoneId);

        var threshold = ReviewConstants.LowActivityTaskThreshold(period.PeriodType);

        var report = await db.ReviewReports
            .AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.UserId == query.UserId
                     && r.PeriodType == period.PeriodType
                     && r.PeriodStartUtc == period.StartUtc,
                ct);

        return new ReviewReportDto
        {
            PeriodType = period.PeriodType,
            PeriodStartLocal = period.StartLocalDate,
            PeriodEndLocalExclusive = period.EndLocalDateExclusive,
            // letter / generatedAt stay null when no review exists yet.
            Letter = report?.AiGeneratedLetter,
            GeneratedAtUtc = report is null ? null : DateTime.SpecifyKind(report.CreatedAt, DateTimeKind.Utc),
            IsLowActivity = report?.AiInputTaskCount != null && report.AiInputTaskCount < threshold,
        };
    }
}
