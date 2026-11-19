using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class PrewrittenReplyTests
{
    private const string AddCleaning = """
        {"items":[{"kind":"task","title":"大扫除","date":"2026-11-21","startTime":"08:00","endTime":"10:00"}],
         "successReply":"帮你暂排在周六 8:00–10:00，待你确认。"}
        """;

    [Fact]
    public async Task Handle_ScheduleReadThenAddItems_EndsWithPrewrittenReplyWithoutAnotherCall()
    {
        // Arrange: the model reads Saturday's schedule, then adds the task with its reply already written.
        var gateway = new ScriptedGateway(
            new ModelToolCallRequest("read", "list_tasks", """{"startDate":"2026-11-21","endDate":"2026-11-21"}"""),
            new ModelToolCallRequest("add", "add_items", AddCleaning));

        // Act
        var result = await Runtime(gateway).ExecuteAsync(Request(), default);

        // Assert
        result.Error.Should().BeNull(because: "the draft was added successfully");
        result.Text.Should().Be("帮你暂排在周六 8:00–10:00，待你确认。",
            because: "the reply written after reading the schedule already covers the turn");
        gateway.Calls.Should().Be(2, because: "a schedule read before the draft does not need a third call to restate the reply");
    }

    [Fact]
    public async Task Handle_EarlierCallWasNotAScheduleRead_StillAsksModelForTheReply()
    {
        // Arrange: a rejected add, then a corrected one; the prewritten reply knows nothing of the first attempt.
        var gateway = new ScriptedGateway(
            new ModelToolCallRequest("add-1", "add_items", """{"items":[],"successReply":"好了。"}"""),
            new ModelToolCallRequest("add-2", "add_items", AddCleaning));

        // Act
        var result = await Runtime(gateway).ExecuteAsync(Request(), default);

        // Assert
        result.Text.Should().Be("两项都放进待确认清单了。",
            because: "only schedule reads may come before a prewritten reply; other changes need the model to sum up");
        gateway.Calls.Should().Be(3, because: "the closing reply comes from one more model call");
    }

    [Fact]
    public async Task Handle_UserTimeOverlapsSavedTask_NamesOverlapWithoutAnotherCall()
    {
        // Arrange: the user gave 8:00-10:00 and a saved task already sits at 9:00.
        var gateway = new ScriptedGateway(new ModelToolCallRequest("add", "add_items", AddCleaning));

        // Act
        var result = await Runtime(gateway).ExecuteAsync(Request(OverlapsSavedTask), default);

        // Assert
        result.Text.Should().StartWith("帮你暂排在周六 8:00–10:00，待你确认。",
            because: "the model's own reply still opens the answer");
        result.Text.Should().Contain("「大扫除」和已有的「羽毛球」（周六 09:00–11:00）时间重叠",
            because: "an overlap with the user's own time is named, not fixed");
        result.FollowUps.Should().HaveCount(2, because: "moving one or keeping both are the likely next messages");
        gateway.Calls.Should().Be(1, because: "naming the overlap needs no model call of its own");
    }

    [Fact]
    public async Task Handle_ReplyAlreadyNamesOverlap_DoesNotRepeatIt()
    {
        // Arrange: the model saw the schedule and named the overlap itself, with a shortened title.
        var named = AddCleaning.Replace("帮你暂排在周六 8:00–10:00，待你确认。", "帮你暂排在周六 8:00–10:00，和打球时间重叠了，待你确认。");
        var gateway = new ScriptedGateway(new ModelToolCallRequest("add", "add_items", named));

        // Act
        var result = await Runtime(gateway).ExecuteAsync(Request(OverlapsSavedTask), default);

        // Assert
        result.Text.Should().Be("帮你暂排在周六 8:00–10:00，和打球时间重叠了，待你确认。",
            because: "a second overlap note would repeat the warning the model already gave");
        result.FollowUps.Should().HaveCount(2, because: "the move-or-keep follow-ups still save the user typing");
        gateway.Calls.Should().Be(1, because: "the reply is complete without another model call");
    }

    [Fact]
    public async Task Handle_SuggestedTimeOverlapsSavedTask_AsksModelToMoveIt()
    {
        // Arrange: the coach picked 8:00-10:00 itself, so the overlap is its mistake to fix.
        var suggested = AddCleaning.Replace("\"endTime\":\"10:00\"}", "\"endTime\":\"10:00\",\"suggestedFields\":[\"startTime\",\"endTime\"]}");
        var gateway = new ScriptedGateway(new ModelToolCallRequest("add", "add_items", suggested));

        // Act
        var result = await Runtime(gateway).ExecuteAsync(Request(OverlapsSavedTask), default);

        // Assert
        result.Text.Should().Be("两项都放进待确认清单了。", because: "the model gets the conflict and replies after handling it");
        gateway.Calls.Should().Be(2, because: "an overlap at a suggested time is moved by the model, not just named");
    }

    private static Task<ScheduleAssessment> OverlapsSavedTask(IReadOnlyList<TaskProposal> items, CancellationToken ct)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("Australia/Perth");
        DateTimeOffset At(int hour) => new(2026, 11, 21, hour, 0, 0, zone.GetUtcOffset(new DateTime(2026, 11, 21)));
        return Task.FromResult(new ScheduleAssessment("conflict", DateTimeOffset.UtcNow,
            [new ScheduleConflict(items[0].ProposalId, "42", "羽毛球", At(9), At(11))]));
    }

    private static ModelTurnRuntime Runtime(IModelGateway gateway)
    {
        var options = Options.Create(new AiCoachModuleOptions());
        return new ModelTurnRuntime(gateway, options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
    }

    private static ModelTurnRequest Request(
        Func<IReadOnlyList<TaskProposal>, CancellationToken, Task<ScheduleAssessment>>? checkSchedule = null) => new(Guid.NewGuid(),
        [new GatewayUserMessage("周六上午帮我安排大扫除，2小时")], [], "Australia/Perth", DateTimeOffset.UtcNow, null, 0,
        ReadTasks: (_, _, _) => Task.FromResult("[]"), CheckSchedule: checkSchedule, ReviewListEnabled: true);

    /// <summary>Makes each scripted tool call in turn, then replies with plain text.</summary>
    private sealed class ScriptedGateway(params ModelToolCallRequest[] toolCalls) : IModelGateway
    {
        public int Calls { get; private set; }

        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            var index = Calls++;
            return Task.FromResult(index < toolCalls.Length
                ? new ModelCompletionResult(null, [toolCalls[index]], ModelFinishReason.ToolCalls, 10, 10, 20)
                : new ModelCompletionResult("两项都放进待确认清单了。", [], ModelFinishReason.Stop, 10, 10, 20));
        }
    }
}
