namespace BlotzTask.Modules.AiUsage.Contracts;

public record AiUsageSummaryDto(
    int UsedTokens,
    int TotalLimit,
    int RemainingTokens,
    string PlanName,
    DateTime PeriodStartDate,
    DateTime PeriodEndDate
);
