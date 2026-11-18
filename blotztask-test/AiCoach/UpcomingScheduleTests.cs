using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class UpcomingScheduleTests
{
    private static readonly DateTimeOffset LocalNow = new(2026, 11, 16, 9, 30, 0, TimeSpan.FromHours(8));

    [Fact]
    public async Task Handle_TurnStarts_FirstModelCallAlreadyHasTheComingWeek()
    {
        // Arrange
        var reads = new List<(DateOnly Start, DateOnly End)>();
        var gateway = new RecordingGateway();
        var request = Request((start, end, _) =>
        {
            reads.Add((start, end));
            return Task.FromResult("""{"success":true,"days":{"2026-11-21":["09:00-11:00 羽毛球"]}}""");
        });

        // Act
        var result = await Runtime(gateway).ExecuteAsync(request, default);

        // Assert
        result.Error.Should().BeNull(because: "the turn ends with a plain reply");
        reads.Should().Equal([(new DateOnly(2026, 11, 16), new DateOnly(2026, 11, 22))],
            because: "today and the next six days are read once, before the model is asked anything");
        gateway.FirstRequest!.Messages.OfType<GatewaySystemMessage>()
            .Should().Contain(message => message.Content.Contains("09:00-11:00 羽毛球"),
                because: "the first call can plan around Saturday without spending a list_tasks round trip");
    }

    [Fact]
    public async Task Handle_ScheduleReadFails_TurnStillAnswers()
    {
        // Arrange
        var gateway = new RecordingGateway();
        var request = Request((_, _, _) => throw new InvalidOperationException("database unavailable"));

        // Act
        var result = await Runtime(gateway).ExecuteAsync(request, default);

        // Assert
        result.Error.Should().BeNull(because: "a failed preload only means the coach falls back to list_tasks");
        result.Text.Should().Be("好的。", because: "the model still answers the user");
    }

    private static ModelTurnRuntime Runtime(IModelGateway gateway)
    {
        var options = Options.Create(new AiCoachModuleOptions());
        return new ModelTurnRuntime(gateway, options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
    }

    private static ModelTurnRequest Request(Func<DateOnly, DateOnly, CancellationToken, Task<string>> readTasks) =>
        new(Guid.NewGuid(), [new GatewayUserMessage("周六有空打球吗")], [], "Australia/Perth", LocalNow, null, 0,
            ReadTasks: readTasks, ReviewListEnabled: true);

    /// <summary>Keeps the first request it is sent and answers with plain text.</summary>
    private sealed class RecordingGateway : IModelGateway
    {
        public ModelGatewayRequest? FirstRequest { get; private set; }

        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            FirstRequest ??= request;
            return Task.FromResult(new ModelCompletionResult("好的。", [], ModelFinishReason.Stop, 10, 10, 20));
        }
    }
}
