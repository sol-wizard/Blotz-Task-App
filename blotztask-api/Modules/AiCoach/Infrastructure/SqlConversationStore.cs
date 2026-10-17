using System.Runtime.CompilerServices;
using System.Data;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
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
    // A task save is a few inserts; five minutes means its process stopped.
    private static readonly TimeSpan InterruptedSaveAfter = TimeSpan.FromMinutes(5);
    private readonly ConversationLocks _locks = new();
    private readonly ConversationLocks _userLocks = new();
    // Revision each loaded instance was read at; kept outside the domain model.
    private readonly ConditionalWeakTable<Conversation, LoadedRevision> _revisions = new();

    public async Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        // A reader must not combine an old revision with messages from a newer committed turn.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var record = await db.AiCoachConversations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == conversationId, ct);
        if (record is null) return null;
        var messages = await db.AiCoachMessages.AsNoTracking().Where(x => x.ConversationId == conversationId)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).ToListAsync(ct);
        await transaction.CommitAsync(ct);
        return Restore(record, messages);
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
            MessageCount = conversation.Messages.Count,
            EndedAt = conversation.EndedAt,
            ClosingSummary = conversation.ClosingSummary,
            CreatedAt = conversation.CreatedAt,
            LastActivityAt = now,
            Revision = 1,
            SchemaVersion = ConversationSerializer.SchemaVersion,
            Payload = ConversationSerializer.Serialize(conversation),
        });
        foreach (var message in conversation.Messages)
            db.AiCoachMessages.Add(ToRecord(conversation, message));
        await db.SaveChangesAsync(ct);
        _revisions.AddOrUpdate(conversation, new(1, conversation.Messages));
    }

    public async Task<Conversation?> FindOpenAsync(Guid userId, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var id = await db.AiCoachConversations.AsNoTracking()
            .Where(record => record.UserId == userId && record.EndedAt == null)
            .Select(record => (Guid?)record.Id).SingleOrDefaultAsync(ct);
        if (!id.HasValue) return null;
        var conversation = await FindAsync(id.Value, ct);
        if (conversation is not null) return conversation;
        // An unreadable payload version would otherwise keep the filtered unique index occupied and block
        // every new open segment. Its messages stay in the timeline.
        await db.AiCoachConversations.Where(record => record.Id == id.Value && record.EndedAt == null
                && record.SchemaVersion != ConversationSerializer.SchemaVersion)
            .ExecuteUpdateAsync(setters => setters.SetProperty(record => record.EndedAt, clock.GetUtcNow())
                .SetProperty(record => record.Revision, record => record.Revision + 1), ct);
        return null;
    }

    public async Task<string?> FindPreviousSummaryAsync(Guid userId, DateTimeOffset before, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        return await db.AiCoachConversations.AsNoTracking()
            .Where(record => record.UserId == userId && record.EndedAt != null && record.EndedAt <= before)
            .OrderByDescending(record => record.EndedAt).ThenByDescending(record => record.Id)
            .Select(record => record.ClosingSummary).FirstOrDefaultAsync(ct);
    }

    public async Task SaveClosingSummaryAsync(Guid conversationId, string summary, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        // Update-only, once: clearing history cannot be undone by a late summary result.
        await db.AiCoachConversations.Where(record => record.Id == conversationId
                && record.EndedAt != null && record.ClosingSummary == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(record => record.ClosingSummary, summary)
                .SetProperty(record => record.Revision, record => record.Revision + 1), ct);
    }

    public async Task SaveAsync(Conversation conversation, CancellationToken ct)
    {
        if (!_revisions.TryGetValue(conversation, out var loaded))
            throw new InvalidOperationException("Save a conversation only after creating or loading it from this store.");
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var messageCount = conversation.Messages.Count;
        foreach (var draft in conversation.Drafts) conversation.UpdateDraftSnapshots(draft);
        var payload = ConversationSerializer.Serialize(conversation);
        var now = clock.GetUtcNow();
        var expected = loaded.Revision;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Update-only: a deleted conversation is never recreated by a late save or client retry.
        var updated = await db.AiCoachConversations
            .Where(x => x.Id == conversation.Id && x.Revision == expected && x.EndedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.MessageCount, messageCount)
                .SetProperty(x => x.EndedAt, conversation.EndedAt)
                .SetProperty(x => x.ClosingSummary, conversation.ClosingSummary)
                .SetProperty(x => x.LastActivityAt, now)
                .SetProperty(x => x.Revision, expected + 1)
                .SetProperty(x => x.SchemaVersion, ConversationSerializer.SchemaVersion)
                .SetProperty(x => x.Payload, payload), ct);
        if (updated == 1)
        {
            foreach (var message in conversation.Messages)
            {
                var snapshot = ConversationSerializer.SerializeDrafts(message.DraftSnapshot);
                if (!loaded.Snapshots.TryGetValue(message.Id, out var previous))
                    db.AiCoachMessages.Add(ToRecord(conversation, message));
                else if (snapshot != previous)
                    await db.AiCoachMessages.Where(x => x.Id == message.Id && x.ConversationId == conversation.Id)
                        .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.DraftSnapshot, snapshot), ct);
            }
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            _revisions.AddOrUpdate(conversation, new(expected + 1, conversation.Messages));
            return;
        }

        await transaction.RollbackAsync(ct);
        var latest = await FindAsync(conversation.Id, ct);
        if (latest is null) throw new ConversationNotFoundException();
        ConversationApplication.RequireOpen(latest);
        logger.LogWarning("AiCoach conversation {ConversationId} changed by another writer at revision {Revision}",
            conversation.Id, expected);
        throw new ConversationVersionConflictException(latest);
    }

    public Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct) =>
        _locks.AcquireAsync(conversationId, ct);

    public Task<IDisposable> AcquireUserLockAsync(Guid userId, CancellationToken ct) =>
        _userLocks.AcquireAsync(userId, ct);

    private Conversation? Restore(AiCoachConversationRecord record, IReadOnlyList<AiCoachMessage> messages)
    {
        if (record.SchemaVersion != ConversationSerializer.SchemaVersion)
        {
            logger.LogWarning("AiCoach conversation {ConversationId} has unsupported schema version {SchemaVersion}",
                record.Id, record.SchemaVersion);
            return null;
        }
        var conversation = ConversationSerializer.Deserialize(record.Payload);
        conversation.EndedAt = record.EndedAt;
        conversation.ClosingSummary = record.ClosingSummary;
        conversation.Messages.AddRange(messages.Select(message => new ConversationMessage(message.Id, message.Role,
            message.Content, message.TaskContextRead, message.TurnId, message.CreatedAt,
            ConversationSerializer.DeserializeDrafts(message.DraftSnapshot))));
        _revisions.AddOrUpdate(conversation, new(record.Revision, conversation.Messages));
        // Past every model budget, a running turn belongs to a stopped process. The release is saved with
        // the next write; until then each load repeats it identically.
        var turnLimit = TimeSpan.FromSeconds(options.Value.ModelRequestTimeoutSeconds * options.Value.MaxModelCallsPerTurn)
            + TimeSpan.FromMinutes(2);
        if (conversation.ReleaseInterruptedWork(clock.GetUtcNow(), turnLimit, InterruptedSaveAfter))
        {
            foreach (var draft in conversation.Drafts) conversation.UpdateDraftSnapshots(draft);
            logger.LogWarning("AiCoach conversation {ConversationId} released interrupted work", record.Id);
        }
        return conversation;
    }

    private static AiCoachMessage ToRecord(Conversation conversation, ConversationMessage message) => new()
    {
        Id = message.Id, ConversationId = conversation.Id, UserId = conversation.UserId,
        Role = message.Role, Content = message.Content, TaskContextRead = message.TaskContextRead,
        TurnId = message.TurnId, CreatedAt = message.CreatedAt,
        DraftSnapshot = ConversationSerializer.SerializeDrafts(message.DraftSnapshot),
    };

    private sealed class LoadedRevision(int revision, IEnumerable<ConversationMessage> messages)
    {
        public int Revision { get; } = revision;
        public Dictionary<Guid, string?> Snapshots { get; } = messages.ToDictionary(message => message.Id,
            message => ConversationSerializer.SerializeDrafts(message.DraftSnapshot));
    }
}
