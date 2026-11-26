using BlotzTask.Modules.BreakDown.Services;
using FluentAssertions;

namespace BlotzTask.Tests.Services;

public class HedgedRequestTests
{
    private static readonly TimeSpan HedgeAfter = TimeSpan.FromMilliseconds(100);

    // A fake AI call: each call takes the next delay from the list, then returns its number (or throws).
    private sealed class FakeCalls(params (int DelayMs, bool Fails)[] plan)
    {
        public int Started { get; private set; }
        public List<int> Cancelled { get; } = [];

        public async Task<int> Call(CancellationToken ct)
        {
            var n = ++Started;
            var (delayMs, fails) = plan[n - 1];
            try
            {
                await Task.Delay(delayMs, ct);
            }
            catch (OperationCanceledException)
            {
                Cancelled.Add(n);
                throw;
            }
            if (fails) throw new InvalidOperationException($"call {n} failed");
            return n;
        }
    }

    [Fact]
    public async Task Handle_FirstCallFast_DoesNotAskAgain()
    {
        // Arrange
        var calls = new FakeCalls((10, false), (10, false));

        // Act
        var result = await HedgedRequest.RunAsync(calls.Call, HedgeAfter, CancellationToken.None);

        // Assert
        result.Should().Be(new HedgedResult<int>(1, Hedged: false), because: "a normal run must not cost a second AI call");
        calls.Started.Should().Be(1, because: "the second call starts only after the wait");
    }

    [Fact]
    public async Task Handle_FirstCallSlow_UsesTheSecondAndCancelsTheFirst()
    {
        // Arrange
        var calls = new FakeCalls((5000, false), (10, false));

        // Act
        var result = await HedgedRequest.RunAsync(calls.Call, HedgeAfter, CancellationToken.None);
        await Task.Delay(50);

        // Assert
        result.Should().Be(new HedgedResult<int>(2, Hedged: true), because: "the user gets whichever answer comes first");
        calls.Cancelled.Should().Equal([1], because: "the slow call is stopped once it has lost");
    }

    [Fact]
    public async Task Handle_FirstCallFinishesFirstAfterHedge_UsesItAndCancelsTheSecond()
    {
        // Arrange
        var calls = new FakeCalls((200, false), (5000, false));

        // Act
        var result = await HedgedRequest.RunAsync(calls.Call, HedgeAfter, CancellationToken.None);
        await Task.Delay(50);

        // Assert
        result.Should().Be(new HedgedResult<int>(1, Hedged: true), because: "the original call can still win the race");
        calls.Cancelled.Should().Equal([2], because: "the losing call is stopped either way");
    }

    [Fact]
    public async Task Handle_FirstFinisherFails_WaitsForTheOther()
    {
        // Arrange: the second call fails quickly, the first succeeds a bit later
        var calls = new FakeCalls((300, false), (10, true));

        // Act
        var result = await HedgedRequest.RunAsync(calls.Call, HedgeAfter, CancellationToken.None);

        // Assert
        result.Should().Be(new HedgedResult<int>(1, Hedged: true), because: "one failed call must not throw away a good answer");
    }

    [Fact]
    public async Task Handle_BothCallsFail_Throws()
    {
        // Arrange
        var calls = new FakeCalls((200, true), (10, true));

        // Act
        var act = () => HedgedRequest.RunAsync(calls.Call, HedgeAfter, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>(because: "with no good answer the caller still sees the error");
    }

    [Fact]
    public async Task Handle_BudgetGoneAtTheWait_RunsOnce()
    {
        // Arrange
        var calls = new FakeCalls((300, false), (10, false));

        // Act
        var result = await HedgedRequest.RunAsync(calls.Call, HedgeAfter, CancellationToken.None, tryStartHedge: () => false);

        // Assert
        result.Should().Be(new HedgedResult<int>(1, Hedged: false), because: "other runs used the budget while this one waited");
        calls.Started.Should().Be(1, because: "no second AI call may start without a place in the budget");
    }

    [Fact]
    public async Task Handle_NoHedgeAllowed_RunsOnceEvenWhenSlow()
    {
        // Arrange
        var calls = new FakeCalls((300, false), (10, false));

        // Act
        var result = await HedgedRequest.RunAsync(calls.Call, hedgeAfter: null, CancellationToken.None);

        // Assert
        result.Should().Be(new HedgedResult<int>(1, Hedged: false), because: "when the policy says no (budget or outage), it never asks again");
        calls.Started.Should().Be(1, because: "no second AI call may start");
    }
}
