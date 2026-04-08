using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiUsage.Queries;

public class CheckAiQuotaQuery
{
    public required Guid UserId { get; init; }
}

public class CheckAiQuotaQueryHandler(BlotzTaskDbContext db)
{
    public async Task Handle(CheckAiQuotaQuery query, CancellationToken ct = default)
    {
        var subscription = await db.UserSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == query.UserId, ct);

        if (subscription is null)
        {
            throw new InvalidOperationException($"No subscription found for user {query.UserId}.");
        }

        var currentMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var usedTokens = await db.AiUsageRecords
            .Where(r => r.UserId == query.UserId && r.CreatedAt >= currentMonthStart)
            .SumAsync(r => r.TotalTokens, ct);

        if (usedTokens >= subscription.Plan.MonthlyTokenLimit)
        {
            throw new AiQuotaExceededException();
        }
    }
}
