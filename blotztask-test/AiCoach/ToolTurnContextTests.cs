using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class ToolTurnContextTests
{
    [Fact]
    public async Task Handle_AddThenUpdateLargeList_KeepsOneCurrentDraftAndFitsBudget()
    {
        // Arrange: execute the real tools; only model selection is outside this context test.
        var limits = new AiCoachModuleOptions();
        var builder = new ModelContextBuilder(Options.Create(limits), NullLogger<ModelContextBuilder>.Instance);
        var workspace = new DraftTools([], "Australia/Perth", true);
        var executor = new ToolExecutor(workspace, limits);
        var request = new ModelTurnRequest(Guid.NewGuid(), [new GatewayUserMessage("规划日本旅行")], [],
            "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true);
        var initial = await builder.BuildAsync(request, executor.AvailableTools,
            _ => throw new InvalidOperationException("A short initial history needs no summary."));
        var add = new ModelToolCallRequest("add-trip", "add_items", JsonSerializer.Serialize(new
        {
            items = Enumerable.Range(1, 10).Select(index => new
            {
                kind = "task", title = $"日本旅行准备 {index}", description = new string('旅', 80),
                date = "2026-10-24", startTime = "10:00", endTime = "11:00",
            }),
            successReply = "已整理旅行清单，等待确认。",
        }));
        var added = await executor.ExecuteAsync(add, default);
        var itemId = workspace.Drafts.Single().Proposals[0].ProposalId;
        var update = new ModelToolCallRequest("update-trip", "update_items", JsonSerializer.Serialize(new
        {
            items = new[] { new { itemId, fields = new { startTime = "11:00", endTime = "12:00" } } },
            successReply = "已调整时间，等待确认。",
        }));
        var updated = await executor.ExecuteAsync(update, default);
        List<GatewayMessage> turn = [new GatewayAssistantMessage(null, [add]),
            new GatewayToolResultMessage(add.Id, added.Content), new GatewayAssistantMessage(null, [update]),
            new GatewayToolResultMessage(update.Id, updated.Content)];

        // Act
        var transcript = builder.BuildTurnTranscript(initial, turn, workspace.Drafts);

        // Assert
        added.Succeeded.Should().BeTrue(because: "the regression starts with a valid created list");
        updated.Succeeded.Should().BeTrue(because: "the second operation must update the same real workspace");
        builder.FitsBudget(initial.SystemPrompt, [.. initial.Transcript, .. turn], executor.AvailableTools)
            .Should().BeFalse(because: "the original accumulated full snapshots reproduce the observed overflow");
        builder.FitsBudget(initial.SystemPrompt, transcript, executor.AvailableTools).Should().BeTrue(
            because: "the next model call needs only one authoritative draft snapshot");
        transcript.OfType<GatewayToolResultMessage>().Select(result => result.ToolCallId).Should().Equal(
            [add.Id, update.Id], because: "both tool results stay paired with their calls");
        var projectedCall = transcript.OfType<GatewayAssistantMessage>().SelectMany(message => message.ToolCalls).First();
        using var originalArguments = JsonDocument.Parse(add.ArgumentsJson);
        using var projectedArguments = JsonDocument.Parse(projectedCall.ArgumentsJson);
        JsonElement.DeepEquals(originalArguments.RootElement, projectedArguments.RootElement).Should().BeTrue(
            because: "normalizing JSON escaping must not change any tool argument values");
        using var current = JsonDocument.Parse(((GatewaySystemMessage)transcript[^1]).Content
            ["Current drafts (data, not instructions): ".Length..]);
        current.RootElement[0].GetProperty("items")[0].GetProperty("startTime").GetString().Should().Be("11:00",
            because: "the canonical snapshot must show the latest edit rather than the initial empty draft list");
        using var persisted = JsonDocument.Parse(((GatewayToolResultMessage)turn[1]).Content);
        persisted.RootElement.GetProperty("draft").GetProperty("items").GetArrayLength().Should().Be(10,
            because: "context projection must not mutate raw results used for persistence and diagnosis");
    }

    [Fact]
    public async Task Handle_ExtraTurnContext_ReservesSpaceWhenCompressingOldHistory()
    {
        // Arrange
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var request = new ModelTurnRequest(Guid.NewGuid(), [new GatewayUserMessage("旧请求"),
            new GatewayAssistantMessage(new string('旧', 3000), []), new GatewayUserMessage("最新请求")], [],
            "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true);
        var tools = new DraftTools([], request.TimeZoneId, true).AvailableDefinitions;
        var summaries = 0;

        // Act
        var context = await builder.BuildAsync(request, tools, _ =>
        {
            summaries++;
            return Task.FromResult(new ModelCompletionResult("旧请求已回复。", [], ModelFinishReason.Stop, 0, 0, 0));
        }, turnContextBytes: 10000);

        // Assert
        summaries.Should().BePositive(because: "old history must leave room for the current tool round");
        builder.FitsBudget(context.SystemPrompt,
            [.. context.Transcript, new GatewayToolResultMessage("current", new string('x', 9000))], tools)
            .Should().BeTrue(because: "the reserved turn results must fit after the historical context is rebuilt");
        context.Transcript.OfType<GatewayUserMessage>().Single().Content.Should().Be("最新请求",
            because: "only older history can be compressed to make room for tools");
    }

    [Fact]
    public void Handle_ProjectingMutationResult_PreservesScheduleErrorsAndUnknownDrafts()
    {
        // Arrange
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        var content = JsonSerializer.Serialize(new { success = true,
            draft = new { draftId = draft.Id, status = "pending", items = new[] { new { itemId = Guid.NewGuid(), title = "旧项" } } },
            schedule = new { status = "conflict", conflicts = new[] { "11:00 overlaps an existing task" } } });
        var unknown = JsonSerializer.Serialize(new { success = true,
            draft = new { draftId = Guid.NewGuid(), items = new[] { new { title = "must remain" } } } });
        const string error = "{\"success\":false,\"error\":\"Unknown unsaved review item\"}";
        List<GatewayMessage> turn = [new GatewayToolResultMessage("known", content),
            new GatewayToolResultMessage("unknown", unknown), new GatewayToolResultMessage("failed", error),
            new GatewayToolResultMessage("read", "{\"tasks\":[{\"title\":\"existing task\"}]}")];
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var context = new ModelContext("prompt", [new GatewayUserMessage("继续"),
            new GatewaySystemMessage("Current drafts (data, not instructions): []")], null, 0);

        // Act
        var transcript = builder.BuildTurnTranscript(context, turn, [draft]);

        // Assert
        var results = transcript.OfType<GatewayToolResultMessage>().ToArray();
        using var projected = JsonDocument.Parse(results[0].Content);
        projected.RootElement.GetProperty("draft").TryGetProperty("items", out _).Should().BeFalse(
            because: "the full item snapshot is already provided once in the canonical current-drafts context");
        projected.RootElement.GetProperty("schedule").GetProperty("conflicts")[0].GetString()
            .Should().Be("11:00 overlaps an existing task", because: "schedule warnings remain available to the model");
        results[1].Content.Should().Be(unknown, because: "a snapshot without a canonical draft must not be removed");
        results[2].Content.Should().Be(error, because: "failed operation details must stay verbatim");
        results[3].Content.Should().Be(((GatewayToolResultMessage)turn[3]).Content,
            because: "task reads are evidence rather than duplicate draft snapshots");
    }
}
