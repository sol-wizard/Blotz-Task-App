using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Entities;

namespace BlotzTask.Modules.AiUsage.Services;

public class RecordAiUsageRequest
{
    public required Guid UserId { get; init; }

    public required int InputTokens { get; init; }

    public required int OutputTokens { get; init; }

    public required int TotalTokens { get; init; }
}

public interface IRecordAiUsageService
{
    Task RecordAiUsageAsync(RecordAiUsageRequest request, CancellationToken ct = default);
}

public class RecordAiUsageService(BlotzTaskDbContext db) : IRecordAiUsageService
{
    public async Task RecordAiUsageAsync(RecordAiUsageRequest request, CancellationToken ct = default)
    {
        var usageRecord = new AiUsageRecord
        {
            UserId = request.UserId,
            InputTokens = request.InputTokens,
            OutputTokens = request.OutputTokens,
            TotalTokens = request.TotalTokens,
            CreatedAt = DateTime.UtcNow
        };

        db.AiUsageRecords.Add(usageRecord);
        await db.SaveChangesAsync(ct);
    }
}
