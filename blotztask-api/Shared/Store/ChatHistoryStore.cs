using System.Collections.Concurrent;
using Microsoft.SemanticKernel.ChatCompletion;
namespace BlotzTask.Shared.Store;

public class ChatHistoryStore : IDisposable
{
    private class ChatHistoryEntry
    {
        public ChatHistory History { get; }
        public DateTime LastAccessUtc { get; private set; }

        public ChatHistoryEntry(ChatHistory history)
        {
            History = history;
            Touch();
        }

        public void Touch()
        {
            LastAccessUtc = DateTime.UtcNow;
        }
    }

    private readonly ConcurrentDictionary<string, ChatHistoryEntry> _histories = new();
    private readonly Timer _cleanupTimer;
    private readonly TimeSpan _expiration;
    private readonly TimeSpan _cleanupInterval;
    private bool _disposed;

    public ChatHistoryStore(TimeSpan expiration, TimeSpan? cleanupInterval = null)
    {
        _expiration = expiration;
        _cleanupInterval = cleanupInterval ?? TimeSpan.FromMinutes(5);
        
        _cleanupTimer = new Timer(_ => Cleanup(), null,
            _cleanupInterval, _cleanupInterval);
    }
    
    public ChatHistory GetOrCreate(string connectionId)
    {
        var entry = _histories.GetOrAdd(connectionId, _ => new ChatHistoryEntry(new ChatHistory()));
        entry.Touch();
        return entry.History;
    }
    
    public bool TryGet(string connectionId, out ChatHistory history)
    {
        if (_histories.TryGetValue(connectionId, out var entry))
        {
            entry.Touch();
            history = entry.History;
            return true;
        }

        history = null;
        return false;
    }
    
    public bool Remove(string connectionId)
    {
        return _histories.TryRemove(connectionId, out _);
    }
    
    private void Cleanup()
    {
        var now = DateTime.UtcNow;
        foreach (var kvp in _histories)
        {
            if (now - kvp.Value.LastAccessUtc > _expiration)
            {
                _histories.TryRemove(kvp.Key, out _);
            }
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _cleanupTimer.Dispose();
            _disposed = true;
        }
    }

}