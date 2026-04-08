using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Entities;

namespace BlotzTask.Modules.AiUsage.Services;

public class RecordAiUsageRequest
{
    public required Guid UserId { get; init; }
    public required int PromptTokens { get; init; }
    public required int CompletionTokens { get; init; }
}

public class RecordAiUsageService(BlotzTaskDbContext db)
{
    public async Task RecordAiUsageAsync(RecordAiUsageRequest request, CancellationToken ct = default)
    {
        var usageRecord = new AiUsageRecord
        {
            UserId = request.UserId,
            PromptTokens = request.PromptTokens,
            CompletionTokens = request.CompletionTokens,
            TotalTokens = request.PromptTokens + request.CompletionTokens,
            CreatedAt = DateTime.UtcNow
        };

        db.AiUsageRecords.Add(usageRecord);
        await db.SaveChangesAsync(ct);
    }
}
