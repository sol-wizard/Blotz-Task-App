using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.UserUnderstanding.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.UserUnderstanding.Commands;

/// <summary>Identify the memory by Id (settings screen) or by its short Ref (the AI's forget tool).</summary>
public class ForgetUserMemoryCommand
{
    public required Guid UserId { get; init; }
    public Guid? MemoryId { get; init; }
    public string? Ref { get; init; }
}

public class ForgetUserMemoryCommandHandler(BlotzTaskDbContext db, TimeProvider clock,
    ILogger<ForgetUserMemoryCommandHandler> logger)
{
    /// <returns>False when no single active memory matches.</returns>
    public async Task<bool> Handle(ForgetUserMemoryCommand command, CancellationToken ct = default)
    {
        var active = db.UserMemories.Where(m => m.UserId == command.UserId && m.Status == UserMemoryStatus.Active);
        List<UserMemory> matches;
        if (command.MemoryId is { } id)
            matches = await active.Where(m => m.Id == id).ToListAsync(ct);
        else if (!string.IsNullOrWhiteSpace(command.Ref))
        {
            var reference = command.Ref.Trim().TrimStart('#');
            matches = (await active.ToListAsync(ct))
                .Where(m => m.Ref.StartsWith(reference, StringComparison.OrdinalIgnoreCase)).ToList();
        }
        else return false;
        if (matches.Count != 1) return false;

        // Keep a tombstone: the content hash stays so the same words are never re-learned from old messages.
        var memory = matches[0];
        memory.Status = UserMemoryStatus.Deleted;
        memory.Content = string.Empty;
        memory.EvidenceExcerpt = null;
        memory.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Deleted memory {MemoryId} for user {UserId}", memory.Id, command.UserId);
        return true;
    }
}

public class ClearUserMemoriesCommand
{
    public required Guid UserId { get; init; }
}

public class ClearUserMemoriesCommandHandler(BlotzTaskDbContext db, TimeProvider clock,
    ILogger<ClearUserMemoriesCommandHandler> logger)
{
    /// <summary>"Forget me": every row goes, tombstones included, and past chats are never read for memories again.</summary>
    public async Task<int> Handle(ClearUserMemoriesCommand command, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        // Without tombstones, only the extraction cursor stops old messages being learned again.
        await db.AiCoachConversations.Where(c => c.UserId == command.UserId && c.MemoryProcessedAt < now)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.MemoryProcessedAt, now), ct);
        var removed = await db.UserMemories.Where(m => m.UserId == command.UserId).ExecuteDeleteAsync(ct);
        logger.LogInformation("Cleared {Count} memories for user {UserId}", removed, command.UserId);
        return removed;
    }
}
