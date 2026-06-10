using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Reviews.Dtos;
using BlotzTask.Modules.Reviews.Enums;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Reviews.Queries;

public class GetReviewRequest
{
    [BindRequired, Range(2000, 9999)] public int Year { get; set; }
    [BindRequired, Range(1, 12)] public int Month { get; set; }
}

public class GetReviewQuery
{
    [Required] public required Guid UserId { get; init; }
    [Range(2000, 9999)] public required int Year { get; init; }
    [Range(1, 12)] public required int Month { get; init; }
}

public class GetReviewQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetReviewQueryHandler> logger)
{
    public async Task<ReviewReportDto?> Handle(
        GetReviewQuery query,
        CancellationToken ct = default)
    {
        logger.LogInformation(
            "Fetching saved monthly review for user {UserId} ({Year}-{Month:D2})",
            query.UserId, query.Year, query.Month);

        var periodStartUtc = new DateTimeOffset(query.Year, query.Month, 1, 0, 0, 0, TimeSpan.Zero);

        return await db.ReviewReports
            .AsNoTracking()
            .Where(r => r.UserId == query.UserId
                        && r.PeriodType == ReviewPeriodType.Monthly
                        && r.PeriodStartUtc == periodStartUtc)
            .Select(r => new ReviewReportDto
            {
                Year = r.PeriodStartUtc.Year,
                Month = r.PeriodStartUtc.Month,
                AiGeneratedLetter = r.AiGeneratedLetter,
                CreatedAt = r.CreatedAt,
                IsLowActivity = r.AiInputTaskCount != null
                                && r.AiInputTaskCount < ReviewConstants.LowActivityTaskThreshold,
            })
            .FirstOrDefaultAsync(ct);
    }
}
