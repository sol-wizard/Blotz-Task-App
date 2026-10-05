using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Reviews.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Reviews.Services;

/// <summary>
/// Metrics shared by generating and fetching a review, so both paths report the same numbers.
/// </summary>
public static class ReviewMetrics
{
    /// <summary>
    /// Days the user opened the app in the period, or null when the period doesn't report it
    /// (see <see cref="ReviewPeriod.ReportsDaysActive"/>).
    /// </summary>
    public static async Task<int?> CountDaysActiveAsync(
        BlotzTaskDbContext db,
        Guid userId,
        ReviewPeriod period,
        CancellationToken ct = default)
    {
        if (!period.ReportsDaysActive)
            return null;

        // Activity rows hold the user's local date, so the local bounds apply directly.
        return await db.UserActivityDays
            .AsNoTracking()
            .CountAsync(
                a => a.UserId == userId
                     && a.LocalDate >= period.StartLocalDate
                     && a.LocalDate < period.EndLocalDateExclusive,
                ct);
    }
}
