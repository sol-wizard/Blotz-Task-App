namespace BlotzTask.Modules.BreakDown.Services;

public record HedgedResult<T>(T Value, bool Hedged);

/// <summary>
/// Runs a call; if it hasn't finished after <c>hedgeAfter</c>, starts the same call again and uses
/// whichever succeeds first, then cancels the other. With <c>hedgeAfter</c> null it runs the call once.
/// <c>tryStartHedge</c> is asked right before the second call starts; false means run once after all.
/// </summary>
public static class HedgedRequest
{
    public static async Task<HedgedResult<T>> RunAsync<T>(
        Func<CancellationToken, Task<T>> call,
        TimeSpan? hedgeAfter,
        CancellationToken ct,
        Func<bool>? tryStartHedge = null)
    {
        using var firstCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var first = call(firstCts.Token);

        if (hedgeAfter is null) return new HedgedResult<T>(await first, Hedged: false);

        using (var delayCts = CancellationTokenSource.CreateLinkedTokenSource(ct))
        {
            var delay = Task.Delay(hedgeAfter.Value, delayCts.Token);
            if (await Task.WhenAny(first, delay) == first)
            {
                delayCts.Cancel();
                return new HedgedResult<T>(await first, Hedged: false);
            }
        }

        if (ct.IsCancellationRequested)
        {
            // The caller gave up while waiting: the first call is cancelled with it; observe its end.
            Observe(first);
            ct.ThrowIfCancellationRequested();
        }

        if (tryStartHedge != null && !tryStartHedge())
            return new HedgedResult<T>(await first, Hedged: false);

        using var secondCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var second = call(secondCts.Token);

        var winner = await Task.WhenAny(first, second);
        var other = winner == first ? second : first;

        // The first to finish failed: the other may still succeed, so wait for it.
        if (!winner.IsCompletedSuccessfully)
        {
            try
            {
                var value = await other;
                Observe(winner);
                return new HedgedResult<T>(value, Hedged: true);
            }
            catch when (!ct.IsCancellationRequested)
            {
                // Both failed: report the first failure, as if there had been no hedge.
                await winner;
                throw;
            }
        }

        (other == first ? firstCts : secondCts).Cancel();
        Observe(other);

        return new HedgedResult<T>(await winner, Hedged: true);
    }

    // A call nobody awaits any more ends in an exception; observe it so it isn't reported as unhandled.
    private static void Observe(Task task) =>
        _ = task.ContinueWith(t => _ = t.Exception, TaskContinuationOptions.OnlyOnFaulted);
}
