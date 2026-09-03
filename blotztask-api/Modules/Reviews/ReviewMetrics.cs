using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Reviews.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Reviews;

public static class ReviewMetrics
{
    public static Task<int> CountCompletedAsync(
        BlotzTaskDbContext db,
        Guid userId,
        ReviewPeriod period,
        CancellationToken ct = default)
    {
        return db.TaskItems
            .AsNoTracking()
            .CountAsync(
                t => t.UserId == userId
                     && t.CompletedAt != null
                     && t.CompletedAt >= period.StartUtc
                     && t.CompletedAt < period.EndUtc,
                ct);
    }
}
