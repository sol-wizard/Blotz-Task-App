using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Modules.AiUsage.Services;

public interface ICheckAiQuotaService
{
    Task CheckQuotaAsync(Guid userId, CancellationToken ct = default);
}

public class CheckAiQuotaService(BlotzTaskDbContext db, IMemoryCache cache) : ICheckAiQuotaService
{
    public async Task CheckQuotaAsync(Guid userId, CancellationToken ct = default)
    {
        if (!cache.TryGetValue($"quota:plan:{userId}", out int monthlyTokenLimit))
        {
            var subscription = await db.UserSubscriptions
                .Where(s => s.UserId == userId)
                .Select(s => new { s.Plan.MonthlyTokenLimit })
                .FirstOrDefaultAsync(ct);

            if (subscription is null)
                throw new InvalidOperationException($"No subscription found for user {userId}.");

            monthlyTokenLimit = subscription.MonthlyTokenLimit;
            cache.Set($"quota:plan:{userId}", monthlyTokenLimit, TimeSpan.FromHours(1));
        }

        var currentMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var usedTokens = await db.AiUsageRecords
            .Where(r => r.UserId == userId && r.CreatedAt >= currentMonthStart)
            .SumAsync(r => r.CompletionTokens, ct);

        if (usedTokens >= monthlyTokenLimit)
        {
            throw new AiQuotaExceededException();
        }
    }
}
