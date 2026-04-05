namespace BlotzTask.Modules.AiUsage.Contracts;

public interface IAiQuotaService
{
    Task CheckQuotaAsync(Guid userId);
    Task RecordUsageAsync(Guid userId, int promptTokens, int completionTokens);
    Task<AiUsageSummaryDto> GetUsageSummaryAsync(Guid userId);
}
