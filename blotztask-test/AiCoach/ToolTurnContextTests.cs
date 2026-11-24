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
    public async Task Handle_LongTopicDrafts_ListsSavedItemsApartAndShowsOldSuggestionsBriefly()
    {
        // Arrange: the shape of a long topic — many early suggestions never added, a few items the user saved,
        // and one fresh suggestion from the latest reply.
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var oldReply = Guid.NewGuid();
        var latestReply = Guid.NewGuid();
        TaskProposal Item(string title, Guid reply, int? savedTaskId = null) => new(Guid.NewGuid(), title,
            "说明" + new string('细', 60), new DateOnly(2026, 11, 24), new TimeOnly(9, 0), new TimeOnly(10, 30),
            "Australia/Perth", null, savedTaskId, SuggestedFields: ["date", "startTime", "endTime"],
            SuggestedInMessageId: reply);
        var draft = new ProposalSet { Id = Guid.NewGuid(), IsReviewList = true };
        draft.Replace([
            .. Enumerable.Range(1, 14).Select(i => Item($"早期建议{i}", oldReply)),
            Item("去健身房", oldReply, savedTaskId: 15091),
            Item("新的建议", latestReply),
        ]);
        var request = new ModelTurnRequest(Guid.NewGuid(), [new GatewayUserMessage("回顾一下今天的计划")], [draft],
            "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true,
            RecentReplyIds: new HashSet<Guid> { latestReply });
        var full = ((GatewaySystemMessage)(await builder.BuildAsync(request with { RecentReplyIds = null }, [],
            _ => throw new InvalidOperationException("No summary is needed."))).Transcript[^1]).Content;

        // Act
        var context = await builder.BuildAsync(request, [], _ => throw new InvalidOperationException("No summary is needed."));

        // Assert
        var content = ((GatewaySystemMessage)context.Transcript[^1]).Content;
        using var drafts = JsonDocument.Parse(content[ModelContextBuilder.DraftContextPrefix.Length..]);
        var view = drafts.RootElement[0];
        view.GetProperty("savedItems").EnumerateArray().Select(item => item.GetProperty("title").GetString())
            .Should().Equal(["去健身房"], because: "what the user added must stand apart so a recap includes it");
        view.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("title").GetString())
            .Should().Equal(["新的建议"], because: "only suggestions from recent replies are shown in full");
        view.GetProperty("olderUnsavedItems").GetArrayLength().Should().Be(14,
            because: "old suggestions stay addressable by itemId, just without their full detail");
        System.Text.Encoding.UTF8.GetByteCount(content).Should().BeLessThan(System.Text.Encoding.UTF8.GetByteCount(full) / 2,
            because: "a long topic must not carry every early suggestion in full on every call");
    }

    [Fact]
    public async Task Handle_AddThenUpdateLargeList_KeepsOneCurrentDraftAndFitsBudget()
    {
        // Arrange: execute the real tools; only model selection is outside this context test.
        // With the system prompt, accumulated snapshots measure about 57k bytes and the projection about 42k,
        // so 48k separates them regardless of the default budget. Re-measure if the prompt grows a lot.
        var limits = new AiCoachModuleOptions { ContextTokenBudget = 48000 };
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
            [ModelContextBuilder.DraftContextPrefix.Length..]);
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
        // The module default: the review-list prompt and tools alone now take about half of it, so a smaller
        // budget leaves no room for history at all.
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions { ContextTokenBudget = 48000 }),
            NullLogger<ModelContextBuilder>.Instance);
        var request = new ModelTurnRequest(Guid.NewGuid(), [new GatewayUserMessage("旧请求"),
            new GatewayAssistantMessage(new string('旧', 5000), []), new GatewayUserMessage("最新请求")], [],
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

    [Fact]
    public void Handle_CompactSuperseded_ShrinksReplacedResultsAndKeepsUncoveredReads()
    {
        // Arrange: a week read, a read of only part of it, a read of the next week, then two list edits.
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        string Read(string start, string end) => JsonSerializer.Serialize(new { success = true, startDate = start, endDate = end,
            items = new[] { new { title = "existing " + start } } });
        string Edit(string title) => JsonSerializer.Serialize(new { success = true,
            draft = new { draftId = draft.Id, status = "pending", items = new[] { new { itemId = Guid.NewGuid(), title } } },
            schedule = new { status = "conflict", conflicts = new[] { title + " overlaps" } } });
        ModelToolCallRequest Call(string id, string name) => new(id, name, "{}");
        List<GatewayMessage> turn =
        [
            new GatewayAssistantMessage(null, [Call("partial", "list_tasks"), Call("next", "list_tasks")]),
            new GatewayToolResultMessage("partial", Read("2026-11-17", "2026-11-18")),
            new GatewayToolResultMessage("next", Read("2026-11-23", "2026-11-29")),
            new GatewayAssistantMessage(null, [Call("week", "list_tasks")]),
            new GatewayToolResultMessage("week", Read("2026-11-16", "2026-11-22")),
            new GatewayAssistantMessage(null, [Call("first", "add_items")]),
            new GatewayToolResultMessage("first", Edit("first")),
            new GatewayAssistantMessage(null, [Call("second", "update_items")]),
            new GatewayToolResultMessage("second", Edit("second")),
        ];
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var context = new ModelContext("prompt", [new GatewayUserMessage("排下两周")], null, 0);

        // Act
        var compact = builder.BuildTurnTranscript(context, turn, [draft], compactSuperseded: true);
        var full = builder.BuildTurnTranscript(context, turn, [draft]);

        // Assert
        var results = compact.OfType<GatewayToolResultMessage>().ToDictionary(result => result.ToolCallId, result => result.Content);
        results.Should().HaveCount(5, because: "every tool call keeps a result so calls and results stay paired");
        results["partial"].Should().Contain("superseded").And.NotContain("existing",
            because: "a later read this turn covers all of its dates");
        results["next"].Should().Contain("existing 2026-11-23", because: "no later read covers the next week");
        results["week"].Should().Contain("existing 2026-11-16", because: "the latest read is never dropped");
        results["first"].Should().Contain("superseded").And.NotContain("first overlaps",
            because: "a later edit replaced this draft result, so its schedule check is stale");
        results["second"].Should().Contain("second overlaps", because: "the latest edit keeps its schedule evidence");
        full.OfType<GatewayToolResultMessage>().Single(result => result.ToolCallId == "partial").Content
            .Should().Contain("existing", because: "without compaction earlier results stay as they were, keeping the prompt cache");
    }
}
