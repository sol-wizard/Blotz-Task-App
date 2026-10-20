using BlotzTask.Modules.AiCoach.Domain.Conversations;
using System.Collections.Concurrent;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>Session storage; callers serialize mutations with AcquireLockAsync.</summary>
public interface IConversationStore
{
    Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct);
    Task<Conversation?> FindOpenAsync(Guid userId, CancellationToken ct);
    Task<string?> FindPreviousSummaryAsync(Guid userId, DateTimeOffset before, CancellationToken ct);
    /// <summary>Write only if the ended source's loaded database revision is still current.</summary>
    Task SaveClosingSummaryAsync(Conversation source, string summary, CancellationToken ct);

    Task CreateAsync(Conversation conversation, CancellationToken ct);

    /// <summary>
    /// Persist changes to a conversation that was created or loaded through this store. Never recreates a
    /// deleted conversation: throws ConversationNotFoundException, or ConversationVersionConflictException
    /// when another writer changed it first.
    /// </summary>
    Task SaveAsync(Conversation conversation, CancellationToken ct);

    /// <summary>Hold around segment read/modify/save; release before model calls or formal task transactions.</summary>
    Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct);
    Task<IDisposable> AcquireUserLockAsync(Guid userId, CancellationToken ct);
}

/// <summary>Process-local storage for unit tests and the evaluation harness.</summary>
public sealed class InMemoryConversationStore(IMemoryCache cache) : IConversationStore
{
    private readonly ConversationLocks _locks = new();
    private readonly ConversationLocks _userLocks = new();
    private readonly ConcurrentDictionary<Guid, Conversation> _conversations = new();

    private static string Key(Guid conversationId) => $"aicoach:conversation:{conversationId}";

    public Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct) =>
        Task.FromResult(cache.TryGetValue<Conversation>(Key(conversationId), out var conversation)
            ? conversation
            : null);

    public Task<Conversation?> FindOpenAsync(Guid userId, CancellationToken ct) => Task.FromResult(
        _conversations.Values.FirstOrDefault(conversation => conversation.UserId == userId && conversation.EndedAt is null));

    public Task<string?> FindPreviousSummaryAsync(Guid userId, DateTimeOffset before, CancellationToken ct) =>
        Task.FromResult(_conversations.Values.Where(conversation => conversation.UserId == userId
                && conversation.EndedAt.HasValue && conversation.EndedAt <= before)
            .OrderByDescending(conversation => conversation.EndedAt).ThenByDescending(conversation => conversation.Id)
            .FirstOrDefault()?.ClosingSummary);

    public Task SaveClosingSummaryAsync(Conversation source, string summary, CancellationToken ct)
    {
        if (_conversations.TryGetValue(source.Id, out var conversation) && conversation.EndedAt.HasValue
            && conversation.Version == source.Version)
            conversation.ClosingSummary ??= summary;
        return Task.CompletedTask;
    }

    public async Task CreateAsync(Conversation conversation, CancellationToken ct)
    {
        var current = await FindOpenAsync(conversation.UserId, ct);
        if (current is not null && current.Id != conversation.Id && conversation.EndedAt is null)
            throw new ConversationVersionConflictException(current);
        await SaveAsync(conversation, ct);
    }

    public Task SaveAsync(Conversation conversation, CancellationToken ct)
    {
        cache.Set(Key(conversation.Id), conversation);
        _conversations[conversation.Id] = conversation;
        return Task.CompletedTask;
    }

    public Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct) =>
        _locks.AcquireAsync(conversationId, ct);

    public Task<IDisposable> AcquireUserLockAsync(Guid userId, CancellationToken ct) =>
        _userLocks.AcquireAsync(userId, ct);
}

/// <summary>Per-conversation mutual exclusion within this process.</summary>
internal sealed class ConversationLocks
{
    // Bounded lock stripes avoid leaking a semaphore for every expired session.
    private readonly SemaphoreSlim[] _locks = Enumerable.Range(0, 128)
        .Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    public async Task<IDisposable> AcquireAsync(Guid conversationId, CancellationToken ct)
    {
        var semaphore = _locks[(uint)conversationId.GetHashCode() % (uint)_locks.Length];
        await semaphore.WaitAsync(ct);
        return new Releaser(semaphore);
    }

    private sealed class Releaser(SemaphoreSlim semaphore) : IDisposable
    {
        private int _disposed;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 0)
                semaphore.Release();
        }
    }
}
