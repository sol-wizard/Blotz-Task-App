using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>Session storage; callers serialize mutations with AcquireLockAsync.</summary>
public interface IConversationStore
{
    Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct);

    Task CreateAsync(Conversation conversation, CancellationToken ct);

    /// <summary>
    /// Persist changes to a conversation that was created or loaded through this store. Never recreates a
    /// deleted conversation: throws ConversationNotFoundException, or ConversationVersionConflictException
    /// when another writer changed it first.
    /// </summary>
    Task SaveAsync(Conversation conversation, CancellationToken ct);

    /// <summary>Hold only around local state changes, never a model or database call.</summary>
    Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct);
}

/// <summary>Process-local storage for unit tests and the evaluation harness.</summary>
public sealed class InMemoryConversationStore(IMemoryCache cache) : IConversationStore
{
    private readonly ConversationLocks _locks = new();

    private static string Key(Guid conversationId) => $"aicoach:conversation:{conversationId}";

    public Task<Conversation?> FindAsync(Guid conversationId, CancellationToken ct) =>
        Task.FromResult(cache.TryGetValue<Conversation>(Key(conversationId), out var conversation)
            ? conversation
            : null);

    public Task CreateAsync(Conversation conversation, CancellationToken ct) => SaveAsync(conversation, ct);

    public Task SaveAsync(Conversation conversation, CancellationToken ct)
    {
        cache.Set(Key(conversation.Id), conversation);
        return Task.CompletedTask;
    }

    public Task<IDisposable> AcquireLockAsync(Guid conversationId, CancellationToken ct) =>
        _locks.AcquireAsync(conversationId, ct);
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
