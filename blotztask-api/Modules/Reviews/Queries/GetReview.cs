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
    [BindRequired] public DateTimeOffset PeriodStartUtc { get; set; }
}

public class GetReviewQuery
{
    [Required] public required Guid UserId { get; init; }
    public required ReviewPeriodType PeriodType { get; init; }
    public required DateTimeOffset PeriodStartUtc { get; init; }
}

public class GetReviewQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetReviewQueryHandler> logger)
{
    public async Task<ReviewReportDto?> Handle(
        GetReviewQuery query,
        CancellationToken ct = default)
    {
        // Validate alignment + derive bounds on the server (throws 400 on a bad start).
        var period = ReviewPeriod.Create(query.PeriodType, query.PeriodStartUtc);

        logger.LogInformation(
            "Fetching saved {PeriodType} review for user {UserId} (start {PeriodStartUtc:o})",
            period.PeriodType, query.UserId, period.StartUtc);

        var threshold = ReviewConstants.LowActivityTaskThreshold(period.PeriodType);

        return await db.ReviewReports
            .AsNoTracking()
            .Where(r => r.UserId == query.UserId
                        && r.PeriodType == period.PeriodType
                        && r.PeriodStartUtc == period.StartUtc)
            .Select(r => new ReviewReportDto
            {
                PeriodType = r.PeriodType,
                PeriodStartUtc = r.PeriodStartUtc,
                PeriodEndUtc = r.PeriodEndUtc,
                AiGeneratedLetter = r.AiGeneratedLetter,
                CreatedAt = r.CreatedAt,
                IsLowActivity = r.AiInputTaskCount != null
                                && r.AiInputTaskCount < threshold,
            })
            .FirstOrDefaultAsync(ct);
    }
}
