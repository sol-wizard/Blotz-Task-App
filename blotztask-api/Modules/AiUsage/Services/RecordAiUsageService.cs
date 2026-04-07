using BlotzTask.Infrastructure.Data;

namespace BlotzTask.Modules.AiUsage.Services;

public class RecordAiUsageRequest
{
    public required Guid UserId { get; init; }
    public required int PromptTokens { get; init; }
    public required int CompletionTokens { get; init; }
}

public class RecordAiUsageService(BlotzTaskDbContext db)
{
    public Task RecordAiUsageAsync(RecordAiUsageRequest request, CancellationToken ct = default)
    {
        // Note: to be implemented
        throw new NotImplementedException();
    }
}
