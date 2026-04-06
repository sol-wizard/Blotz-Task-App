using BlotzTask.Infrastructure.Data;

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
    public Task<AiUsageSummaryDto> Handle(GetAiUsageSummaryQuery query, CancellationToken ct = default)
    {
        // Note: to be implemented
        throw new NotImplementedException();
    }
}
