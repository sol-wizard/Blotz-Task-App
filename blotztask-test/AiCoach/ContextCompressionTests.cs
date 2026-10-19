using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class ContextCompressionTests
{
    [Fact]
    public async Task Handle_OversizedSummaryWithNoOlderMessages_RecompressesSummaryAndPreservesLatestMessage()
    {
        // Arrange
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified,
            [new GatewayUserMessage("继续调整家庭清洁清单")], [], "Australia/Perth", DateTimeOffset.UtcNow,
            new string('旧', 5000), 0, ReviewListEnabled: true);
        var tools = new BlotzTask.Modules.AiCoach.Ai.Tools.DraftTools([], request.TimeZoneId, true).AvailableDefinitions;
        var summaries = 0;

        // Act
        var context = await builder.BuildAsync(request, tools, summaryRequest =>
        {
            summaries++;
            return Task.FromResult(new ModelCompletionResult("用户希望继续调整家庭清洁计划，当前草稿单独保留。", [],
                ModelFinishReason.Stop, 0, 0, 0));
        });

        // Assert
        summaries.Should().Be(1, because: "an oversized summary must be compressed even with no historical prefix left");
        builder.FitsBudget(context.SystemPrompt, context.Transcript, tools).Should().BeTrue(
            because: "summary output must fit the remaining final-request budget");
        context.SummarizedMessageCount.Should().Be(0, because: "recompressing a summary does not cover new messages");
        context.Transcript.OfType<GatewayUserMessage>().Single().Content.Should().Be("继续调整家庭清洁清单",
            because: "the latest user message is not part of summary recompression");
    }

    [Fact]
    public async Task Handle_HistorySummaryStillTooLong_RecompressesBeforeReturningContext()
    {
        // Arrange
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified,
            [new GatewayUserMessage("旧问题"), new GatewayAssistantMessage("旧回复", []),
                new GatewayUserMessage("现在继续")], [], "Australia/Perth", DateTimeOffset.UtcNow,
            new string('旧', 4000), 0,
            ReadTasks: (_, _, _) => throw new InvalidOperationException("Context building must not read tasks."),
            ReviewListEnabled: true);
        var tools = new BlotzTask.Modules.AiCoach.Ai.Tools.DraftTools([], request.TimeZoneId, true).AvailableDefinitions;
        var summaries = 0;

        // Act
        var context = await builder.BuildAsync(request, tools, _ => Task.FromResult(
            new ModelCompletionResult(++summaries == 1 ? new string('长', 4000) : "家庭清洁计划仍待调整。", [],
                ModelFinishReason.Stop, 0, 0, 0)));

        // Assert
        summaries.Should().Be(2, because: "a completed history summary can still require a shorter output");
        builder.FitsBudget(context.SystemPrompt, context.Transcript, tools).Should().BeTrue(
            because: "a successful summary call alone does not prove the final context fits");
        context.SummarizedMessageCount.Should().Be(2, because: "only the historical exchange was summarized");
    }

    [Fact]
    public async Task Handle_SummaryNeverShrinks_StopsAfterTwoRecompressionAttempts()
    {
        // Arrange
        var builder = new ModelContextBuilder(Options.Create(new AiCoachModuleOptions()),
            NullLogger<ModelContextBuilder>.Instance);
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified,
            [new GatewayUserMessage("继续")], [], "Australia/Perth", DateTimeOffset.UtcNow,
            new string('旧', 5000), 0, ReviewListEnabled: true);
        var tools = new BlotzTask.Modules.AiCoach.Ai.Tools.DraftTools([], request.TimeZoneId, true).AvailableDefinitions;
        var summaries = 0;

        // Act
        var action = () => builder.BuildAsync(request, tools, _ =>
        {
            summaries++;
            return Task.FromResult(new ModelCompletionResult(new string('长', 5000), [],
                ModelFinishReason.Stop, 0, 0, 0));
        });

        // Assert
        (await action.Should().ThrowAsync<ModelContextException>(
            because: "oversized summaries must not trigger an unbounded model loop"))
            .Which.Code.Should().Be("context_summary_failed", because: "the summary failed its size contract");
        summaries.Should().Be(2, because: "at most two summary recompression calls are allowed");
    }

    [Fact]
    public async Task Handle_LargeToolExchange_SummarizesWholeExchangeAndPreservesCurrentState()
    {
        // Arrange: a complete tool exchange exceeds the preferred 32,000 / 3 byte batch.
        var options = Options.Create(new AiCoachModuleOptions());
        var builder = new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance);
        var jsonOptions = new System.Text.Json.JsonSerializerOptions
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };
        var call = new ModelToolCallRequest("cleaning-list", "create_list",
            System.Text.Json.JsonSerializer.Serialize(new { description = new string('清', 1500) }, jsonOptions));
        var result = new GatewayToolResultMessage(call.Id,
            System.Text.Json.JsonSerializer.Serialize(new { success = true, description = new string('洁', 2800) }, jsonOptions));
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified,
            [new GatewayUserMessage("制定家庭清洁日程"), new GatewayAssistantMessage(null, [call]),
                result, new GatewayAssistantMessage("清单已生成，等待确认。", []),
                new GatewayUserMessage("可以继续调整吗？")],
            [draft], "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true);
        var tools = new BlotzTask.Modules.AiCoach.Ai.Tools.DraftTools([draft], request.TimeZoneId, true).AvailableDefinitions;
        var summaryRequests = new List<ModelGatewayRequest>();

        // Act
        var context = await builder.BuildAsync(request, tools, summaryRequest =>
        {
            summaryRequests.Add(summaryRequest);
            return Task.FromResult(new ModelCompletionResult("用户需要家庭清洁清单，草稿等待确认。", [],
                ModelFinishReason.Stop, 0, 0, 0));
        });

        // Assert
        builder.FitsBudget(context.SystemPrompt, context.Transcript, tools).Should().BeTrue(
            because: "one tool exchange larger than the preferred summary batch must not block further chat");
        context.SummarizedMessageCount.Should().BeGreaterThanOrEqualTo(3,
            because: "historical tool calls and their complete results can be summarized before the latest user turn");
        context.Transcript.OfType<GatewayUserMessage>().Single().Content.Should().Be("可以继续调整吗？",
            because: "the latest user request must remain verbatim");
        ((GatewaySystemMessage)context.Transcript[^1]).Content.Should().Contain(draft.Id.ToString(),
            because: "the current structured draft remains available after history compression");
        summaryRequests.Should().NotBeEmpty(because: "this oversized history requires compression");
        foreach (var summaryRequest in summaryRequests)
            builder.FitsBudget(summaryRequest.SystemPrompt, summaryRequest.Messages, summaryRequest.Tools)
                .Should().BeTrue(because: "summary requests have their own serialized input budget");
    }

    [Fact]
    public async Task Handle_MultipleToolResults_KeepsCallAndResultsInOneBoundedSummaryRequest()
    {
        // Arrange
        var options = Options.Create(new AiCoachModuleOptions());
        var builder = new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance);
        var first = new ModelToolCallRequest("first", "create_list", "{}");
        var second = new ModelToolCallRequest("second", "update_list", "{}");
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified,
            [new GatewayAssistantMessage(null, [first, second]),
                new GatewayToolResultMessage(first.Id, new string('甲', 2000)),
                new GatewayToolResultMessage(second.Id, new string('乙', 2000)),
                new GatewayUserMessage("保留我刚才的修改")], [], "Australia/Perth", DateTimeOffset.UtcNow,
            new string('\\', 2000), 0, ReviewListEnabled: true);
        var tools = new BlotzTask.Modules.AiCoach.Ai.Tools.DraftTools([], request.TimeZoneId, true).AvailableDefinitions;
        var summaryRequests = new List<ModelGatewayRequest>();

        // Act
        var context = await builder.BuildAsync(request, tools, summaryRequest =>
        {
            summaryRequests.Add(summaryRequest);
            return Task.FromResult(new ModelCompletionResult("两次清单修改已完成。", [],
                ModelFinishReason.Stop, 0, 0, 0));
        });

        // Assert
        summaryRequests.Should().ContainSingle(because: "the two results belong to one indivisible tool exchange");
        var input = summaryRequests.Single();
        using var payload = System.Text.Json.JsonDocument.Parse(((GatewayUserMessage)input.Messages.Single()).Content);
        var transcript = payload.RootElement.GetProperty("transcript").EnumerateArray().ToArray();
        transcript.Select(item => item.GetProperty("role").GetString()).Should().Equal(
            ["assistant", "tool", "tool"], because: "no tool result can be separated from its originating call");
        builder.FitsBudget(input.SystemPrompt, input.Messages, []).Should().BeTrue(
            because: "the escaped prior summary and the JSON envelope count toward the actual input budget");
        builder.FitsBudget(context.SystemPrompt, context.Transcript, tools).Should().BeTrue(
            because: "the complete group can be compressed within the existing total budget");
    }

    [Fact]
    public async Task Handle_ToolExchangeExceedingHardSummaryBudget_DoesNotSendOversizedSummaryOrDropHistory()
    {
        // Arrange
        var options = Options.Create(new AiCoachModuleOptions());
        var builder = new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance);
        var call = new ModelToolCallRequest("oversized", "create_list", "{}");
        List<GatewayMessage> history = [new GatewayAssistantMessage(null, [call]),
            new GatewayToolResultMessage(call.Id, new string('长', 12000)),
            new GatewayUserMessage("继续")];
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified, history, [],
            "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true);
        var summaries = 0;

        // Act
        var context = await builder.BuildAsync(request, [], _ =>
        {
            summaries++;
            throw new InvalidOperationException("An oversized summary request must never reach the model.");
        });

        // Assert
        summaries.Should().Be(0, because: "a group exceeding the hard cap must not be sent to the provider");
        context.SummarizedMessageCount.Should().Be(0, because: "unsummarized data cannot be marked as covered");
        context.Transcript.Take(history.Count).Should().Equal(history,
            because: "an uncompressible exchange must not be silently split, truncated or discarded");
    }

    [Fact]
    public async Task Handle_LatestUserTurnWithToolResults_PreservesTheWholeCurrentTurn()
    {
        // Arrange
        var options = Options.Create(new AiCoachModuleOptions());
        var builder = new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance);
        var call = new ModelToolCallRequest("current", "create_list", "{}");
        List<GatewayMessage> history = [new GatewayUserMessage("最新请求"),
            new GatewayAssistantMessage(null, [call]),
            new GatewayToolResultMessage(call.Id, new string('新', 7000))];
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified, history, [],
            "Australia/Perth", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true);
        var summaries = 0;

        // Act
        var context = await builder.BuildAsync(request, [], _ =>
        {
            summaries++;
            throw new InvalidOperationException("The current user turn is not historical context.");
        });

        // Assert
        summaries.Should().Be(0, because: "the latest request and its in-progress tools must remain verbatim");
        context.Transcript.Take(history.Count).Should().Equal(history,
            because: "compression must stop before the latest user message rather than before the last array element");
    }

    [Fact]
    public async Task Handle_LongTurnFollowedByLargeDraftEvents_SummarizesInsteadOfHittingContextLimit()
    {
        // Arrange: the shape that stuck a real conversation — one long reply, then many full-draft
        // events before the next user message, larger than one summary window.
        var options = Options.Create(new AiCoachModuleOptions());
        var builder = new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance);
        var draftEvent = "App draft event (data): " + new string('周', 2000);
        List<GatewayMessage> history =
        [
            new GatewayUserMessage("我需要考CCL"),
            new GatewayAssistantMessage(new string('答', 800), []),
            new GatewaySystemMessage(draftEvent), new GatewaySystemMessage(draftEvent),
            new GatewaySystemMessage(draftEvent), new GatewaySystemMessage(draftEvent),
            new GatewayUserMessage("哪里比较好玩呢"),
        ];
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified, history, [],
            "Australia/Sydney", DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true);
        var summaries = 0;

        // Act
        var context = await builder.BuildAsync(request, [], _ =>
        {
            summaries++;
            return Task.FromResult(new ModelCompletionResult("用户在准备 CCL，编辑过备考清单。", [],
                ModelFinishReason.Stop, 0, 0, 0));
        });

        // Assert
        summaries.Should().BePositive(because: "app events are safe cut points, so the long prefix can be summarized");
        builder.FitsBudget(context.SystemPrompt, context.Transcript, []).Should().BeTrue(
            because: "after summarizing, the turn must reach the model instead of failing with context_limit");
        context.Transcript.OfType<GatewayUserMessage>().Last().Content.Should().Be("哪里比较好玩呢",
            because: "the latest user message always stays verbatim");
    }

    [Fact]
    public void Handle_RepeatedEditsOfOneDraft_KeepOnlyTheLatestEventUnescaped()
    {
        // Arrange
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Mode = AiCoachMode.Unified,
            TimeZoneId = "Australia/Sydney", CreatedAt = DateTimeOffset.UtcNow,
        };
        var draft = new ProposalSet { Id = Guid.NewGuid() };

        // Act
        conversation.RecordDraftEvent("edited_by_user", draft);
        conversation.RecordDraftEvent("edited_by_user", draft);
        conversation.RecordDraftEvent("discarded_by_user", draft);

        // Assert
        conversation.History.Should().ContainSingle(because: "each event carries the whole draft, so only the latest matters");
        ((GatewaySystemMessage)conversation.History[0]).Content.Should().Contain("discarded_by_user",
            because: "the latest action replaces earlier ones");
    }
}
