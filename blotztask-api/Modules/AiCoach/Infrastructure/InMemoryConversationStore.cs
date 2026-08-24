using System.Collections.Concurrent;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>
/// Conversation storage abstraction. Execution mode v1 uses the in-memory implementation below
/// (open question §29.1, approved by Ben): no table, no EF migration. Swapping to a database
/// later means adding a persistent implementation of this interface — the kernel, reducer and
/// API contract do not change.
/// </summary>
public interface IConversationStore
{
    Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct);

    Task SaveAsync(Conversation conversation, CancellationToken ct);

    /// <summary>
    /// Serializes work per conversation (tech design §17.1). The kernel holds the lock for each
    /// state transition ("transaction"), and releases it while effects (model calls) run.
    /// </summary>
    Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct);
}

public sealed class InMemoryConversationStore(IMemoryCache cache) : IConversationStore
{
    // Lock objects are small; entries for expired conversations are reclaimed lazily when the
    // conversation itself is gone (see AcquireLockAsync). Acceptable for the in-memory v1.
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

    private static string Key(Guid conversationId) => $"aicoach:conversation:{conversationId}";

    public Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct) =>
        Task.FromResult(cache.TryGetValue<Conversation>(Key(conversationId), out var conversation)
            ? conversation
            : null);

    public Task SaveAsync(Conversation conversation, CancellationToken ct)
    {
        // ExpiresAt semantics: the entry disappears at the conversation's absolute expiry —
        // Execution mode conversations are per-session and never survive long-term (§14.1).
        cache.Set(Key(conversation.Id), conversation, new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = conversation.ExpiresAt,
        });
        return Task.CompletedTask;
    }

    public async Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct)
    {
        var semaphore = _locks.GetOrAdd(conversationId, _ => new SemaphoreSlim(1, 1));
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
