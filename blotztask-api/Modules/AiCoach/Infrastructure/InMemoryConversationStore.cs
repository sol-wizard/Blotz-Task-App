using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>Session storage; callers serialize mutations with AcquireLockAsync.</summary>
public interface IConversationStore
{
    Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct);

    Task SaveAsync(Conversation conversation, CancellationToken ct);

    /// <summary>Hold only around local state changes, never a model or database call.</summary>
    Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct);
}

public sealed class InMemoryConversationStore(IMemoryCache cache) : IConversationStore
{
    // Bounded lock stripes avoid leaking a semaphore for every expired session.
    private readonly SemaphoreSlim[] _locks = Enumerable.Range(0, 128)
        .Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    private static string Key(Guid conversationId) => $"aicoach:conversation:{conversationId}";

    public Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct) =>
        Task.FromResult(cache.TryGetValue<Conversation>(Key(conversationId), out var conversation)
            ? conversation
            : null);

    public Task SaveAsync(Conversation conversation, CancellationToken ct)
    {
        // ExpiresAt semantics: the entry disappears at the conversation's absolute expiry —
        // In-memory conversations are per-session and never survive long-term.
        cache.Set(Key(conversation.Id), conversation, new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = conversation.ExpiresAt,
        });
        return Task.CompletedTask;
    }

    public async Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct)
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
