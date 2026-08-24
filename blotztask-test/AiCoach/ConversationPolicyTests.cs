using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// Pure Pre-/Post-Policy tests (v3 tech design §8/§12/§13), including the three-mode
/// boundaries of §24.1 — Clarify and Companion are policy-tested here even though v1 only
/// registers Execution.
/// </summary>
public class ConversationPolicyTests
{
    private static readonly Guid UserId = Guid.NewGuid();

    private readonly ConversationPrePolicy _prePolicy = new();
    private readonly ConversationPostPolicy _postPolicy = new();

    private static ConversationSnapshot Snapshot(
        AiCoachModeDefinition mode,
        ConversationPhase phase = ConversationPhase.Conversing,
        ProposalSetSnapshot? set = null,
        OpenQuestionSnapshot? openQuestion = null) => new(
        Guid.NewGuid(), UserId, mode.Mode, phase,
        GenerationStatus.Running, BlockedReason.None, Version: 3,
        set, openQuestion, new HashSet<ConversationFact>(),
        new HashSet<ConversationAction>(), mode.ToRuntimeVersions(2));

    private static ProposalSetSnapshot PendingSet() => new(
        Guid.NewGuid(), ProposalSet.SchemaVersion, ProposalSetStatus.Pending, 1,
        [
            new TaskProposal(Guid.NewGuid(), "整理资料", null,
                new DateOnly(2026, 8, 26), new TimeOnly(9, 0), new TimeOnly(9, 30),
                "Australia/Sydney", null),
        ]);

    private static ProposalSetCandidate Proposals(int count = 1) => new(
        Enumerable.Range(1, count).Select(i => new TaskProposalCandidate(
            $"p{i}", $"任务{i}", null,
            new DateOnly(2026, 8, 26), new TimeOnly(9 + i, 0), new TimeOnly(9 + i, 30), null)).ToList());

    private static ModelTurnCandidate Candidate(
        ConversationStrategy strategy,
        AssistantResponseCandidate response,
        ProposalSetCandidate? proposals = null,
        bool actionIntent = false,
        string? quote = null,
        bool rejectedAction = false) => new(
        new InterpretationSignals(IntentType.ConcreteAction, actionIntent, quote, rejectedAction),
        strategy, response, proposals);

    private StrategyDecision Decide(
        AiCoachModeDefinition mode,
        ModelTurnCandidate candidate,
        ConversationSnapshot? snapshot = null,
        bool evidenceVerified = false)
    {
        snapshot ??= Snapshot(mode);
        var envelope = _prePolicy.Build(snapshot, mode);
        return _postPolicy.Decide(new PolicyContext(snapshot, envelope, candidate, mode, evidenceVerified));
    }

    // ---------- Pre-Policy envelopes ----------

    [Fact]
    public void PrePolicy_WithoutAPendingSet_OffersTheBroadEnvelopeIncludingProposals()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();

        // Act
        var envelope = _prePolicy.Build(Snapshot(mode), mode);

        // Assert
        envelope.AllowedStrategies.Should().Contain(ConversationStrategy.ShowProposalSet,
            because: "v3 §8.3: the first-version envelope stays broad; Post-Policy narrows");
        envelope.AllowedStrategies.Should().Contain(ConversationStrategy.AskClarifyingQuestion);
        envelope.ProposalConstraints.ProposalAllowed.Should().BeTrue();
    }

    [Fact]
    public void PrePolicy_WithAPendingSet_OnlyAllowsDiscussingIt()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var snapshot = Snapshot(mode, ConversationPhase.ActionPending, PendingSet());

        // Act
        var envelope = _prePolicy.Build(snapshot, mode);

        // Assert
        envelope.AllowedStrategies.Should().BeEquivalentTo(
            new[] { ConversationStrategy.ContinueListening, ConversationStrategy.DiscussExistingProposal },
            because: "one open Current ProposalSet is a hard invariant; v1 keeps card edits client-local");
        envelope.ProposalConstraints.ProposalAllowed.Should().BeFalse();
    }

    // ---------- Post-Policy: proposal path gates ----------

    [Fact]
    public void PostPolicy_ProposalWithVerifiedExplicitIntent_IsAccepted()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("建议 9 点开始。"),
            Proposals(), actionIntent: true, quote: "帮我安排");

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: true);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        decision.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        decision.AcceptProposalSetCandidate.Should().BeTrue();
    }

    [Fact]
    public void PostPolicy_ProposalWithoutVerifiedEvidence_IsDowngradedToClarifying()
    {
        // Arrange — the model claims intent but the Evidence Guard could not verify the quote.
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("建议 9 点开始。"),
            Proposals(), actionIntent: true, quote: "编造的引文");

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: false);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded,
            because: "model inference alone can never open the proposal path (v3 §14.1)");
        decision.FinalStrategy.Should().Be(ConversationStrategy.AskClarifyingQuestion);
        decision.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid);
        decision.AcceptProposalSetCandidate.Should().BeFalse();
    }

    [Fact]
    public void PostPolicy_ProposalWithoutActionIntent_IsDowngraded()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("我帮你排好了。"),
            Proposals(), actionIntent: false);

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: false);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded);
        decision.ReasonCode.Should().Be(StrategyReasonCode.ExplicitActionIntentRequired);
    }

    [Fact]
    public void PostPolicy_ProposalStrategyWithoutAProposalSet_IsDowngraded()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("我帮你排好了。"),
            proposals: null, actionIntent: true, quote: "帮我安排");

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: true);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded);
        decision.ReasonCode.Should().Be(StrategyReasonCode.ProposalSetMissing);
    }

    [Fact]
    public void PostPolicy_ProposalOverAPendingCard_IsDowngradedToDiscussion()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var snapshot = Snapshot(mode, ConversationPhase.ActionPending, PendingSet());
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("再帮你排一件。"),
            Proposals(), actionIntent: true, quote: "帮我安排");

        // Act
        var decision = Decide(mode, candidate, snapshot, evidenceVerified: true);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded,
            because: "no second card while one is pending (v3 §13.8 hard invariant)");
        decision.FinalStrategy.Should().Be(ConversationStrategy.DiscussExistingProposal);
        decision.ReasonCode.Should().Be(StrategyReasonCode.PendingProposalSetAlreadyExists);
    }

    [Fact]
    public void PostPolicy_TooManyProposals_IsDowngraded()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("排好了。"),
            Proposals(ProposalSet.MaxProposals + 1), actionIntent: true, quote: "帮我安排");

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: true);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded);
        decision.ReasonCode.Should().Be(StrategyReasonCode.ProposalSetInvalid);
    }

    // ---------- Post-Policy: contract discipline ----------

    [Fact]
    public void PostPolicy_ResponseTypeMismatch_RequiresRegeneration()
    {
        // Arrange — strategy says clarifying question but the response is a listening reply.
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.AskClarifyingQuestion,
            new ListeningResponse("好的。"));

        // Act
        var decision = Decide(mode, candidate);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration,
            because: "a broken output contract earns one regeneration before falling back (v3 §15)");
        decision.ReasonCode.Should().Be(StrategyReasonCode.ResponseTypeMismatch);
    }

    [Fact]
    public void PostPolicy_QuestionStrategyWithoutAQuestion_RequiresRegeneration()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.AskClarifyingQuestion,
            new ClarifyingQuestionResponse("想先做什么？", Question: " "));

        // Act
        var decision = Decide(mode, candidate);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.RequiresRegeneration);
    }

    [Fact]
    public void PostPolicy_StrayProposalSetOnAListeningTurn_IsDiscarded()
    {
        // Arrange
        var mode = ExecutionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ContinueListening,
            new ListeningResponse("听起来不错。"),
            Proposals());

        // Act
        var decision = Decide(mode, candidate);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        decision.AcceptProposalSetCandidate.Should().BeFalse(
            because: "a proposal set is only ever accepted through the ShowProposalSet path");
    }

    // ---------- Three-mode boundaries (v3 §24.1) ----------

    [Fact]
    public void Companion_EmotionalMessageWithoutExplicitInstruction_NeverGetsAProposal()
    {
        // Arrange
        var mode = CompanionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("要不要安排一下？"),
            Proposals(), actionIntent: false);

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: false);

        // Assert
        decision.AcceptProposalSetCandidate.Should().BeFalse(
            because: "Companion's moods, wishes and model inference never create a ProposalSet");
        decision.DecisionType.Should().Be(StrategyDecisionType.Downgraded);
    }

    [Fact]
    public void Companion_ExplicitDirectInstructionInCurrentMessage_MayCreateAPendingSet()
    {
        // Arrange — "请帮我安排明天 8 点到 9 点整理资料" with a verified quote (v3 §8.2 example).
        var mode = CompanionModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.ShowProposalSet,
            new ProposalIntroductionResponse("好的，已经放到卡片上了，确认一下吧。"),
            Proposals(), actionIntent: true, quote: "请帮我安排明天 8 点到 9 点整理资料");

        // Act
        var decision = Decide(mode, candidate, evidenceVerified: true);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Accepted,
            because: "an explicit direct instruction in the current message is the one Companion exception");
        decision.AcceptProposalSetCandidate.Should().BeTrue();
    }

    [Fact]
    public void Clarify_ChoosingAGoal_IsAcceptedWithoutAnyProposal()
    {
        // Arrange
        var mode = ClarifyModeDefinition.Create();
        var candidate = Candidate(
            ConversationStrategy.AskUserToChooseGoal,
            new GoalChoiceResponse("你现在有两个方向，想先推进哪一个？", "想先推进哪一个？"));

        // Act
        var decision = Decide(mode, candidate);

        // Assert
        decision.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        decision.AcceptProposalSetCandidate.Should().BeFalse();
    }
}
