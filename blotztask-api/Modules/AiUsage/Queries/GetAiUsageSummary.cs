using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
namespace BlotzTask.Modules.AiUsage.Queries;

public record AiUsageSummaryDto(
    int UsedTokens,
    int TotalLimit,
    int RemainingTokens,
    string PlanName,
    DateTime PeriodStartDate,
    DateTime PeriodEndDate
);

public class GetAiUsageSummaryQuery
{
    public required Guid UserId { get; init; }
}

public class GetAiUsageSummaryQueryHandler(BlotzTaskDbContext db)
{
    public async Task<AiUsageSummaryDto> Handle(GetAiUsageSummaryQuery query, CancellationToken ct = default)
    {
         var subscription = await db.UserSubscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == query.UserId, ct) ?? throw new NotFoundException("User has no active subscription.");
        var periodStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1).AddSeconds(-1);
        var usedTokens = await db.AiUsageRecords
            .Where(r => r.UserId == query.UserId&&r.CreatedAt>=periodStart && r.CreatedAt<=periodEnd)
            .SumAsync(r => r.CompletionTokens, ct);
        return new AiUsageSummaryDto(
            UsedTokens: usedTokens,
            TotalLimit: subscription.Plan.MonthlyTokenLimit,
            RemainingTokens: Math.Max(0, subscription.Plan.MonthlyTokenLimit - usedTokens),
            PlanName: subscription.Plan.Name,
            PeriodStartDate: periodStart,
            PeriodEndDate: periodEnd
        );
    }
}
