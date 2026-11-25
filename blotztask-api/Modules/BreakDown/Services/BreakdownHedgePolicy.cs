namespace BlotzTask.Modules.BreakDown.Services;

/// <summary>
/// Decides when a slow breakdown should be asked again (a hedged request), from the run times this
/// server has seen. Kept in memory: a restart starts again from the default wait.
/// </summary>
public class BreakdownHedgePolicy
{
    // Recent runs that set the wait: the 95th percentile of them, between the floor and the cap.
    public const int WindowSize = 100;
    public const int MinSamples = 20;
    public static readonly TimeSpan DefaultWait = TimeSpan.FromSeconds(15);
    public static readonly TimeSpan MinWait = TimeSpan.FromSeconds(10);
    public static readonly TimeSpan MaxWait = TimeSpan.FromSeconds(30);

    // At most 10 hedges in the last 100 runs, so the extra AI calls stay under 10%.
    public const int MaxHedgesInWindow = 10;

    // When 6 of the last 20 runs were slow, the AI is slow for everyone (an outage):
    // asking again only adds load, so stop hedging until it recovers.
    public const int RecentSize = 20;
    public const int MaxSlowInRecent = 6;

    private readonly object _lock = new();
    private readonly Queue<Run> _runs = new();

    // Hedges that have started but whose run hasn't been recorded yet. Counted in the budget,
    // so many breakdowns running at once can't all hedge on the same old numbers.
    private int _hedgesInFlight;

    private record Run(TimeSpan Duration, bool Hedged, bool Slow);

    /// <summary>How long to wait before asking again, or null when this run must not hedge.</summary>
    public TimeSpan? GetHedgeDelay()
    {
        lock (_lock)
        {
            if (IsBudgetUsedUp() || IsOutage()) return null;
            return CurrentWait();
        }
    }

    /// <summary>
    /// Called at the moment a run is about to ask again. Takes one place in the budget, or returns false
    /// when it's gone (other runs hedged in the meantime). Every true must be followed by RecordRun(hedged: true).
    /// </summary>
    public bool TryStartHedge()
    {
        lock (_lock)
        {
            if (IsBudgetUsedUp() || IsOutage()) return false;
            _hedgesInFlight++;
            return true;
        }
    }

    /// <summary>Records every finished run, failed ones too, so an outage of slow failures is seen.</summary>
    public void RecordRun(TimeSpan duration, bool hedged)
    {
        lock (_lock)
        {
            if (hedged && _hedgesInFlight > 0) _hedgesInFlight--;
            // "Slow" is judged against the wait before this run is added, so one slow run can't hide itself.
            _runs.Enqueue(new Run(duration, hedged, Slow: duration > CurrentWait()));
            if (_runs.Count > WindowSize) _runs.Dequeue();
        }
    }

    private bool IsBudgetUsedUp() => _runs.Count(r => r.Hedged) + _hedgesInFlight >= MaxHedgesInWindow;

    private bool IsOutage() => _runs.TakeLast(RecentSize).Count(r => r.Slow) >= MaxSlowInRecent;

    private TimeSpan CurrentWait()
    {
        if (_runs.Count < MinSamples) return DefaultWait;

        var sorted = _runs.Select(r => r.Duration).Order().ToList();
        var p95 = sorted[(int)Math.Ceiling(sorted.Count * 0.95) - 1];
        return p95 < MinWait ? MinWait : p95 > MaxWait ? MaxWait : p95;
    }
}
