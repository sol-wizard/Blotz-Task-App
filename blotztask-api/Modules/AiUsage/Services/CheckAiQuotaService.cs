using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiUsage.Services;

public interface ICheckAiQuotaService
{
    Task CheckQuotaAsync(Guid userId, CancellationToken ct = default);
}

public class CheckAiQuotaService(BlotzTaskDbContext db) : ICheckAiQuotaService
{
    public async Task CheckQuotaAsync(Guid userId, CancellationToken ct = default)
    {
        var subscription = await db.UserSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (subscription is null)
        {
            throw new InvalidOperationException($"No subscription found for user {userId}.");
        }

        var currentMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var usedTokens = await db.AiUsageRecords
            .Where(r => r.UserId == userId && r.CreatedAt >= currentMonthStart)
            .SumAsync(r => r.TotalTokens, ct);

        if (usedTokens >= subscription.Plan.MonthlyTokenLimit)
        {
            throw new AiQuotaExceededException();
        }
    }
}
