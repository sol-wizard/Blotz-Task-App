using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>
/// Durable conversation storage. Each operation uses its own DbContext, so store writes never join a
/// handler's task transaction. The in-process lock serializes one instance; the revision check protects
/// against writers on other instances.
/// </summary>
public sealed class SqlConversationStore(IServiceScopeFactory scopes, TimeProvider clock,
    IOptions<AiCoachModuleOptions> options, ILogger<SqlConversationStore> logger) : IConversationStore
{
    // Element limits are what the user sees; character limits match the column lengths.
    private const int TitleLength = 30, TitleColumnLength = 60;
    private const int PreviewLength = 100, PreviewColumnLength = 120;
    private readonly ConversationLocks _locks = new();
    // Revision each loaded instance was read at; kept outside the domain model.
    private readonly ConditionalWeakTable<Conversation, LoadedRevision> _revisions = new();

    public async Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var record = await db.AiCoachConversations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == conversationId, ct);
        return record is null ? null : Restore(record);
    }

    public async Task CreateAsync(Conversation conversation, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var now = clock.GetUtcNow();
        db.AiCoachConversations.Add(new AiCoachConversationRecord
        {
            Id = conversation.Id,
            UserId = conversation.UserId,
            Mode = conversation.Mode,
            Title = Title(conversation),
            LastMessagePreview = Preview(conversation),
            MessageCount = conversation.Messages.Count,
            HasPendingDraft = HasPendingDraft(conversation),
            CreatedAt = conversation.CreatedAt,
            LastActivityAt = now,
            Revision = 1,
            SchemaVersion = ConversationSerializer.SchemaVersion,
            Payload = ConversationSerializer.Serialize(conversation),
        });
        await db.SaveChangesAsync(ct);
        _revisions.AddOrUpdate(conversation, new(1));
    }

    public async Task SaveAsync(Conversation conversation, CancellationToken ct)
    {
        if (!_revisions.TryGetValue(conversation, out var loaded))
            throw new InvalidOperationException("Save a conversation only after creating or loading it from this store.");
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var title = Title(conversation);
        var preview = Preview(conversation);
        var messageCount = conversation.Messages.Count;
        var hasPendingDraft = HasPendingDraft(conversation);
        var payload = ConversationSerializer.Serialize(conversation);
        var now = clock.GetUtcNow();
        var expected = loaded.Revision;
        // Update-only: a deleted conversation is never recreated by a late save or client retry.
        var updated = await db.AiCoachConversations
            .Where(x => x.Id == conversation.Id && x.Revision == expected)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Title, title)
                .SetProperty(x => x.LastMessagePreview, preview)
                .SetProperty(x => x.MessageCount, messageCount)
                .SetProperty(x => x.HasPendingDraft, hasPendingDraft)
                .SetProperty(x => x.LastActivityAt, now)
                .SetProperty(x => x.Revision, expected + 1)
                .SetProperty(x => x.SchemaVersion, ConversationSerializer.SchemaVersion)
                .SetProperty(x => x.Payload, payload), ct);
        if (updated == 1)
        {
            loaded.Revision = expected + 1;
            return;
        }

        var current = await db.AiCoachConversations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == conversation.Id, ct);
        var latest = current is null ? null : Restore(current);
        if (latest is null) throw new ConversationNotFoundException();
        logger.LogWarning("AiCoach conversation {ConversationId} changed by another writer at revision {Revision}",
            conversation.Id, current!.Revision);
        throw new ConversationVersionConflictException(latest);
    }

    public Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct) =>
        _locks.AcquireAsync(conversationId, ct);

    private Conversation? Restore(AiCoachConversationRecord record)
    {
        if (record.LastActivityAt <= clock.GetUtcNow().AddDays(-options.Value.ConversationRetentionDays))
            return null;
        if (record.SchemaVersion != ConversationSerializer.SchemaVersion)
        {
            logger.LogWarning("AiCoach conversation {ConversationId} has unsupported schema version {SchemaVersion}",
                record.Id, record.SchemaVersion);
            return null;
        }
        var conversation = ConversationSerializer.Deserialize(record.Payload);
        _revisions.AddOrUpdate(conversation, new(record.Revision));
        return conversation;
    }

    private static string? Title(Conversation conversation) =>
        Truncate(conversation.Messages.FirstOrDefault(message => message.Role == ConversationMessageRole.User)?.Content,
            TitleLength, TitleColumnLength);

    private static string? Preview(Conversation conversation) =>
        Truncate(conversation.Messages.LastOrDefault()?.Content, PreviewLength, PreviewColumnLength);

    private static bool HasPendingDraft(Conversation conversation) =>
        conversation.Drafts.Any(draft => draft.Status == ProposalSetStatus.Pending);

    /// <summary>
    /// Single-line text cut by text element, so emoji and combined characters stay intact, and kept within
    /// the column's UTF-16 length.
    /// </summary>
    private static string? Truncate(string? text, int maxElements, int maxChars)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var line = string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        var builder = new StringBuilder();
        var elements = StringInfo.GetTextElementEnumerator(line);
        var count = 0;
        while (elements.MoveNext())
        {
            var element = elements.GetTextElement();
            if (count == maxElements || builder.Length + element.Length > maxChars - 1)
                return builder.Append('…').ToString();
            builder.Append(element);
            count++;
        }
        return line;
    }

    private sealed class LoadedRevision(int revision)
    {
        public int Revision { get; set; } = revision;
    }
}
