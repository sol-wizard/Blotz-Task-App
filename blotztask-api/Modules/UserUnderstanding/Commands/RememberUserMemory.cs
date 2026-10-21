using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.UserUnderstanding.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.UserUnderstanding.Commands;

public class RememberUserMemoryCommand
{
    public required Guid UserId { get; init; }
    public required UserMemoryKind Kind { get; init; }
    public required string Content { get; init; }
    public UserMemoryScope Scope { get; init; } = UserMemoryScope.All;
    public DateTimeOffset? ValidUntil { get; init; }
    /// <summary>Ref of an active memory this one corrects; it is marked superseded.</summary>
    public string? ReplacesRef { get; init; }
    public Guid? SourceMessageId { get; init; }
    public string? Evidence { get; init; }
    public UserMemorySource Source { get; init; } = UserMemorySource.Explicit;
}

public sealed record RememberUserMemoryResult(bool Success, string? ErrorCode, UserMemory? Memory, bool AlreadyKnown = false);

public class RememberUserMemoryCommandHandler(BlotzTaskDbContext db, TimeProvider clock,
    ILogger<RememberUserMemoryCommandHandler> logger)
{
    public async Task<RememberUserMemoryResult> Handle(RememberUserMemoryCommand command, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        var content = Regex.Replace(command.Content.Trim(), @"\s+", " ");
        if (content.Length == 0 || content.Length > UserMemory.MaxContentLength)
            return new(false, "invalid_content", null);
        if (command.ValidUntil is { } until && until <= now)
            return new(false, "invalid_valid_until", null);

        var enabled = await db.UserPreferences.AsNoTracking()
            .Where(p => p.UserId == command.UserId).Select(p => (bool?)p.AiMemoryEnabled).FirstOrDefaultAsync(ct);
        if (enabled == false) return new(false, "memory_disabled", null);

        var hash = Hash(content);
        var active = await db.UserMemories
            .Where(m => m.UserId == command.UserId && m.Status == UserMemoryStatus.Active
                        && (m.ValidUntil == null || m.ValidUntil > now))
            .ToListAsync(ct);

        var extracted = command.Source == UserMemorySource.Extracted;
        // Something the user deleted is never learned back from chat; only asking explicitly restores it.
        if (extracted && await db.UserMemories.AnyAsync(m => m.UserId == command.UserId
                && m.Status == UserMemoryStatus.Deleted && m.ContentHash == hash, ct))
            return new(false, "deleted_by_user", null);

        var same = active.FirstOrDefault(m => m.ContentHash == hash);
        if (same is not null)
        {
            // Saying it again confirms it; a new end date replaces the old one.
            same.LastConfirmedAt = now;
            same.UpdatedAt = now;
            if (!extracted || same.Source == UserMemorySource.Extracted) same.ValidUntil = command.ValidUntil;
            if (Priority(command.Source) > Priority(same.Source)) same.Source = command.Source;
            await db.SaveChangesAsync(ct);
            return new(true, null, same, AlreadyKnown: true);
        }

        UserMemory? replaced = null;
        if (!string.IsNullOrWhiteSpace(command.ReplacesRef))
        {
            var matches = active.Where(m => m.Ref.StartsWith(command.ReplacesRef.Trim().TrimStart('#'),
                StringComparison.OrdinalIgnoreCase)).ToList();
            if (matches.Count != 1) return new(false, "unknown_memory_ref", null);
            // Any memory may be replaced: callers only pass a correction grounded in the user's own words,
            // and users rarely say "forget" — a later "that's over now" is how stale memories leave.
            replaced = matches[0];
        }

        UserMemory? evicted = null;
        if (active.Count - (replaced is null ? 0 : 1) >= UserMemory.MaxActivePerUser)
        {
            // Only learned items make room for other learned items; explicit ones are never dropped silently.
            evicted = extracted
                ? active.Where(m => m.Source == UserMemorySource.Extracted && m != replaced)
                    .OrderBy(m => m.LastConfirmedAt).FirstOrDefault()
                : null;
            if (evicted is null) return new(false, "memory_full", null);
        }

        var memory = new UserMemory
        {
            UserId = command.UserId,
            Kind = command.Kind,
            Scope = command.Scope,
            Content = content,
            ContentHash = hash,
            Source = command.Source,
            SourceMessageId = command.SourceMessageId,
            EvidenceExcerpt = Truncate(command.Evidence?.Trim(), UserMemory.MaxEvidenceLength),
            ValidUntil = command.ValidUntil,
            CreatedAt = now,
            UpdatedAt = now,
            LastConfirmedAt = now,
        };
        db.UserMemories.Add(memory);
        if (replaced is not null)
        {
            replaced.Status = UserMemoryStatus.Superseded;
            replaced.SupersededById = memory.Id;
            replaced.UpdatedAt = now;
        }
        if (evicted is not null)
        {
            evicted.Status = UserMemoryStatus.Superseded;
            evicted.UpdatedAt = now;
        }
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Stored {Source} {Kind} memory {MemoryId} for user {UserId}",
            memory.Source, memory.Kind, memory.Id, command.UserId);
        return new(true, null, memory);
    }

    private static int Priority(UserMemorySource source) => source switch
    {
        UserMemorySource.Explicit => 2,
        UserMemorySource.ConfirmedObservation => 1,
        _ => 0,
    };

    /// <summary>Case- and spacing-insensitive, so the same words are recognised after deletion too.</summary>
    public static string Hash(string content) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            Regex.Replace(content.Trim(), @"\s+", " ").ToLowerInvariant())));

    private static string? Truncate(string? value, int maxChars) =>
        string.IsNullOrEmpty(value) || value.Length <= maxChars ? value : value[..maxChars];
}
