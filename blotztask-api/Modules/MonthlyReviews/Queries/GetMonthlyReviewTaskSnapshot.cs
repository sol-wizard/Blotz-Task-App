using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.MonthlyReviews.Dtos;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.MonthlyReviews.Queries;

public class GetMonthlyReviewRequest
{
    [BindRequired] public DateTimeOffset FirstDate { get; set; }
}

public class GetMonthlyReviewTaskSnapshotQuery
{
    [Required] public required Guid UserId { get; init; }
    [BindRequired] public DateTimeOffset FirstDate { get; set; }
}

public class GetMonthlyReviewTaskSnapshotQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetMonthlyReviewTaskSnapshotQueryHandler> logger)
{
    public async Task<List<MonthlyReviewTaskSnapshotDto>> Handle(
        GetMonthlyReviewTaskSnapshotQuery query,
        CancellationToken ct = default)
    {
        var monthStartUtc = query.FirstDate.UtcDateTime;
        var monthEndUtc = query.FirstDate.AddMonths(1).UtcDateTime;

        logger.LogInformation(
            "Building monthly task snapshot for user {UserId} starting {FirstDate} (UTC window {Start} → {End})",
            query.UserId, query.FirstDate, monthStartUtc, monthEndUtc);

        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => t.UserId == query.UserId
                        && t.CreatedAt >= monthStartUtc
                        && t.CreatedAt < monthEndUtc)
            .OrderBy(t => t.CreatedAt)
            .Select(t => new MonthlyReviewTaskSnapshotDto
            {
                Title = t.Title,
                Details = t.Description ?? string.Empty,
                CreatedDate = t.CreatedAt,
                PlannedDate = t.StartTime,
                TimeTakenMinutes = (int)(t.EndTime - t.StartTime).TotalMinutes,
                IsDone = t.IsDone,
            })
            .ToListAsync(ct);

        // Clamp negative durations defensively (shouldn't happen, but cheap to guard).
        foreach (var snapshot in tasks)
        {
            if (snapshot.TimeTakenMinutes < 0) snapshot.TimeTakenMinutes = 0;
        }

        logger.LogInformation(
            "Returned {Count} tasks for monthly snapshot (user {UserId}, starting {FirstDate})",
            tasks.Count, query.UserId, query.FirstDate);

        return tasks;
    }
}
