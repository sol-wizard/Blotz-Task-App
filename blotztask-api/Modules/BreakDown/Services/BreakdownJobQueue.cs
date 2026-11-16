using System.Threading.Channels;

namespace BlotzTask.Modules.BreakDown.Services;

public record BreakdownJobRequest(int TaskItemId, Guid UserId);

// Breakdown has its own queue so a slow AI call never delays the shared background queue (badges etc.).
public class BreakdownJobQueue
{
    private readonly Channel<BreakdownJobRequest> _queue = Channel.CreateUnbounded<BreakdownJobRequest>();

    public void Enqueue(BreakdownJobRequest request)
    {
        _queue.Writer.TryWrite(request);
    }

    public IAsyncEnumerable<BreakdownJobRequest> ReadAllAsync(CancellationToken ct)
    {
        return _queue.Reader.ReadAllAsync(ct);
    }
}
