using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.MonthlyReviews.Dtos;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.MonthlyReviews.Queries;

public class GetMonthlyReviewRequest
{
    [BindRequired, Range(2000, 9999)] public int Year { get; set; }
    [BindRequired, Range(1, 12)] public int Month { get; set; }
}

public class GetMonthlyReviewQuery
{
    [Required] public required Guid UserId { get; init; }
    [Range(2000, 9999)] public required int Year { get; init; }
    [Range(1, 12)] public required int Month { get; init; }
}

public class GetMonthlyReviewQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetMonthlyReviewQueryHandler> logger)
{
    public async Task<MonthlyReviewDto?> Handle(
        GetMonthlyReviewQuery query,
        CancellationToken ct = default)
    {
        logger.LogInformation(
            "Fetching saved monthly review for user {UserId} ({Year}-{Month:D2})",
            query.UserId, query.Year, query.Month);

        return await db.MonthlyReviewReports
            .AsNoTracking()
            .Where(r => r.UserId == query.UserId
                        && r.Year == query.Year
                        && r.Month == query.Month)
            .Select(r => new MonthlyReviewDto
            {
                Year = r.Year,
                Month = r.Month,
                AiGeneratedLetter = r.AiGeneratedLetter,
                CreatedAt = r.CreatedAt,
            })
            .FirstOrDefaultAsync(ct);
    }
}
