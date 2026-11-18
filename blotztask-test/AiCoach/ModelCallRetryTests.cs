using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class ModelCallRetryTests
{
    [Fact]
    public async Task Handle_StreamFailsBeforeAnyText_RetriesOnceAndReplies()
    {
        // Arrange
        var gateway = new FailingOnceGateway(streamTextBeforeFailing: false);
        var runtime = Runtime(gateway);

        // Act
        var result = await runtime.ExecuteAsync(Request(), default);

        // Assert
        result.Error.Should().BeNull(because: "a dropped stream with nothing shown yet is retried instead of failing the turn");
        result.Text.Should().Be("好的，明天没有安排。", because: "the retried call's reply reaches the user");
        gateway.Calls.Should().Be(2, because: "a failed call is retried exactly once");
        result.ModelCallCount.Should().Be(2, because: "the retry counts toward the turn's model-call limit");
    }

    [Fact]
    public async Task Handle_StreamFailsAfterTextWasShown_FailsWithoutRetrying()
    {
        // Arrange
        var gateway = new FailingOnceGateway(streamTextBeforeFailing: true);
        var runtime = Runtime(gateway);

        // Act
        var result = await runtime.ExecuteAsync(Request(), default);

        // Assert
        result.Error.Should().Be("model_unavailable", because: "text already shown cannot be taken back, so a retry would repeat it");
        gateway.Calls.Should().Be(1, because: "only calls that showed nothing are retried");
    }

    [Theory]
    [InlineData(1, 2, null)]
    [InlineData(60, 1, "model_unavailable")]
    public async Task Handle_RateLimited_WaitsWhenAskedOrFailsFastWhenTheWaitIsTooLong(
        int retryAfterSeconds, int expectedCalls, string? expectedError)
    {
        // Arrange
        var rateLimit = new HttpRequestException("rate limited", null, System.Net.HttpStatusCode.TooManyRequests);
        rateLimit.Data[AzureResponsesModelGateway.RetryAfterKey] = TimeSpan.FromSeconds(retryAfterSeconds);
        var gateway = new FailingOnceGateway(streamTextBeforeFailing: false, rateLimit);
        var runtime = Runtime(gateway);

        // Act
        var result = await runtime.ExecuteAsync(Request(), default);

        // Assert
        gateway.Calls.Should().Be(expectedCalls,
            because: "a short asked-for wait is honoured, but a long one would stall the user, who can retry themselves");
        result.Error.Should().Be(expectedError, because: "only a retried rate limit can still produce a reply");
    }

    [Fact]
    public async Task Handle_RetryLandsOnLastModelCall_RetriesWithoutToolsAndStillReplies()
    {
        // Arrange: three calls allowed; the second, which still offers tools, fails once.
        var gateway = new ToolLoopGateway();
        var runtime = Runtime(gateway, maxModelCalls: 3);

        // Act
        var result = await runtime.ExecuteAsync(Request() with { ReadTasks = (_, _, _) => Task.FromResult("[]") }, default);

        // Assert
        result.Error.Should().BeNull(because: "the retry used the turn's last call, so it must be the closing reply");
        gateway.ToolCountsOffered.Should().Equal([gateway.ToolCountsOffered[0], gateway.ToolCountsOffered[0], 0],
            because: "only the retry on the last call drops the tools; the failed attempt still offered them");
    }

    [Fact]
    public async Task Handle_CallKeepsWritingPastFirstOutputLimit_IsNotCutOff()
    {
        // Arrange: one second to start writing, then the call streams for two seconds without a long gap.
        var gateway = new PacedGateway(progressSteps: 8, gapMs: 250, stallFirstCall: false);
        var runtime = Runtime(gateway, firstOutputSeconds: 1, idleSeconds: 1, callMaxSeconds: 5);

        // Act
        var result = await runtime.ExecuteAsync(Request(), default);

        // Assert
        result.Error.Should().BeNull(because: "a call still writing its output is slow, not stuck");
        gateway.Calls.Should().Be(1, because: "only a stalled or over-long call is cancelled and retried");
    }

    [Fact]
    public async Task Handle_StreamStallsAfterStarting_IsRetriedAfterTheIdleLimit()
    {
        // Arrange: the first call writes once and then goes silent; the retry replies.
        var gateway = new PacedGateway(progressSteps: 1, gapMs: 0, stallFirstCall: true);
        var runtime = Runtime(gateway, firstOutputSeconds: 1, idleSeconds: 1, callMaxSeconds: 30);
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Act
        var result = await runtime.ExecuteAsync(Request(), default);

        // Assert
        result.Error.Should().BeNull(because: "a stalled stream that showed no text is retried like a dropped one");
        gateway.Calls.Should().Be(2, because: "the stall cancels the first call and the retry answers");
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(10),
            because: "the idle limit ends the stall long before the call's overall limit");
    }

    private static ModelTurnRuntime Runtime(IModelGateway gateway, int maxModelCalls = 12,
        int firstOutputSeconds = 60, int idleSeconds = 20, int callMaxSeconds = 120)
    {
        var options = Options.Create(new AiCoachModuleOptions
        {
            MaxModelCallsPerTurn = maxModelCalls, ModelRequestTimeoutSeconds = firstOutputSeconds,
            StreamIdleTimeoutSeconds = idleSeconds, ModelCallMaxSeconds = callMaxSeconds,
        });
        return new ModelTurnRuntime(gateway, options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
    }

    private static ModelTurnRequest Request() => new(Guid.NewGuid(),
        [new GatewayUserMessage("明天有什么安排？")], [], "Australia/Perth", DateTimeOffset.UtcNow, null, 0,
        Stream: (_, _) => Task.CompletedTask);

    /// <summary>Reads tasks while tools are offered, fails the second call once, and replies once tools are gone.</summary>
    private sealed class ToolLoopGateway : IModelGateway
    {
        public List<int> ToolCountsOffered { get; } = [];

        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            ToolCountsOffered.Add(request.Tools.Count);
            if (ToolCountsOffered.Count == 2) throw new HttpRequestException("stream dropped");
            return Task.FromResult(request.Tools.Count == 0
                ? new ModelCompletionResult("明天没有安排。", [], ModelFinishReason.Stop, 10, 10, 20)
                : new ModelCompletionResult(null,
                    [new ModelToolCallRequest($"call-{ToolCountsOffered.Count}", "list_tasks",
                        """{"startDate":"2026-11-16","endDate":"2026-11-16"}""")],
                    ModelFinishReason.ToolCalls, 10, 10, 20));
        }
    }

    private sealed class FailingOnceGateway(bool streamTextBeforeFailing, Exception? failure = null) : IModelGateway
    {
        public int Calls { get; private set; }

        public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            if (++Calls == 1)
            {
                if (streamTextBeforeFailing && request.OnTextDelta is not null) await request.OnTextDelta("好的，");
                throw failure ?? new HttpRequestException("Azure Responses streaming request failed (server_error).");
            }
            return new ModelCompletionResult("好的，明天没有安排。", [], ModelFinishReason.Stop, 10, 10, 20);
        }
    }

    /// <summary>Streams tool arguments (progress without reply text) in steps, optionally going silent on the first call.</summary>
    private sealed class PacedGateway(int progressSteps, int gapMs, bool stallFirstCall) : IModelGateway
    {
        public int Calls { get; private set; }

        public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            Calls++;
            for (var step = 0; step < progressSteps; step++)
            {
                await Task.Delay(gapMs, cancellationToken);
                request.OnOutputProgress?.Invoke();
            }
            if (stallFirstCall && Calls == 1) await Task.Delay(Timeout.Infinite, cancellationToken);
            return new ModelCompletionResult("好的，明天没有安排。", [], ModelFinishReason.Stop, 10, 10, 20);
        }
    }
}
