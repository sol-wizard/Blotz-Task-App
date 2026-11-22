using BlotzTask.Modules.BreakDown.Services;
using FluentAssertions;

namespace BlotzTask.Tests.Services;

public class BreakdownHedgePolicyTests
{
    private static BreakdownHedgePolicy PolicyWith(int count, double seconds, bool hedged = false)
    {
        var policy = new BreakdownHedgePolicy();
        for (var i = 0; i < count; i++) policy.RecordRun(TimeSpan.FromSeconds(seconds), hedged);
        return policy;
    }

    [Fact]
    public void Handle_TooFewSamples_UsesDefaultWait()
    {
        // Arrange
        var policy = PolicyWith(BreakdownHedgePolicy.MinSamples - 1, 6);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().Be(BreakdownHedgePolicy.DefaultWait, because: "the 95th percentile of a few runs means little");
    }

    [Fact]
    public void Handle_EnoughSamples_WaitsForThe95thPercentile()
    {
        // Arrange: 95 runs of 12 s and 5 runs of 25 s → the 95th fastest is 12 s
        var policy = PolicyWith(95, 12);
        for (var i = 0; i < 5; i++) policy.RecordRun(TimeSpan.FromSeconds(25), hedged: false);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().Be(TimeSpan.FromSeconds(12), because: "it hedges only runs slower than 95% of recent ones");
    }

    [Fact]
    public void Handle_FastRuns_NeverWaitsLessThanTheFloor()
    {
        // Arrange
        var policy = PolicyWith(50, 3);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().Be(BreakdownHedgePolicy.MinWait, because: "a very short wait would ask again for normal runs");
    }

    [Fact]
    public void Handle_SlowRunsOverTime_NeverWaitsMoreThanTheCap()
    {
        // Arrange: 6 runs of 40 s long ago, then 94 normal ones → the 95th fastest is 40 s,
        // and the last 20 runs are all normal, so the outage rule stays off
        var policy = new BreakdownHedgePolicy();
        for (var i = 0; i < 6; i++) policy.RecordRun(TimeSpan.FromSeconds(40), hedged: false);
        for (var i = 0; i < 94; i++) policy.RecordRun(TimeSpan.FromSeconds(6), hedged: false);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().Be(BreakdownHedgePolicy.MaxWait, because: "the user should never wait more than 30 s for a second try");
    }

    [Fact]
    public void Handle_BudgetUsedUp_DoesNotHedge()
    {
        // Arrange
        var policy = PolicyWith(BreakdownHedgePolicy.MaxHedgesInWindow, 6, hedged: true);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().BeNull(because: "at most 10% of recent runs may make a second AI call");
    }

    [Fact]
    public void Handle_ManyHedgesStartAtOnce_StopsAtTheBudget()
    {
        // Arrange: a normal history, and many breakdowns all reaching the wait before any of them finishes
        var policy = PolicyWith(30, 6);

        // Act
        var started = Enumerable.Range(0, 20).Count(_ => policy.TryStartHedge());

        // Assert
        started.Should().Be(BreakdownHedgePolicy.MaxHedgesInWindow,
            because: "hedges still running count in the budget, so a sudden slowdown can't double every call");
    }

    [Fact]
    public void Handle_HedgeFinishes_ItsPlaceMovesIntoTheWindow()
    {
        // Arrange
        var policy = PolicyWith(30, 6);
        for (var i = 0; i < BreakdownHedgePolicy.MaxHedgesInWindow; i++) policy.TryStartHedge();

        // Act: one hedge finishes; it now counts as a recorded hedge instead of a running one
        policy.RecordRun(TimeSpan.FromSeconds(8), hedged: true);

        // Assert
        policy.TryStartHedge().Should().BeFalse(because: "a finished hedge still uses the budget for the next 100 runs");
    }

    [Fact]
    public void Handle_OldHedgesLeaveTheWindow_HedgesAgain()
    {
        // Arrange: the budget used up, then a full window of normal runs pushes those hedges out
        var policy = PolicyWith(BreakdownHedgePolicy.MaxHedgesInWindow, 6, hedged: true);
        for (var i = 0; i < BreakdownHedgePolicy.WindowSize; i++) policy.RecordRun(TimeSpan.FromSeconds(6), hedged: false);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().NotBeNull(because: "the budget counts only the last 100 runs");
    }

    [Fact]
    public void Handle_ManyRecentSlowRuns_DoesNotHedge()
    {
        // Arrange: a normal history, then 6 runs far slower than the wait
        var policy = PolicyWith(30, 6);
        for (var i = 0; i < BreakdownHedgePolicy.MaxSlowInRecent; i++) policy.RecordRun(TimeSpan.FromSeconds(60), hedged: false);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().BeNull(because: "when many runs are slow at once the AI is down, and asking again only adds load");
    }

    [Fact]
    public void Handle_AFewSlowRuns_StillHedges()
    {
        // Arrange
        var policy = PolicyWith(30, 6);
        for (var i = 0; i < BreakdownHedgePolicy.MaxSlowInRecent - 1; i++) policy.RecordRun(TimeSpan.FromSeconds(60), hedged: false);

        // Act
        var delay = policy.GetHedgeDelay();

        // Assert
        delay.Should().NotBeNull(because: "an occasional slow run is bad luck, which is what hedging is for");
    }
}
