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
