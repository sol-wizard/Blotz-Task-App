using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Layer 1 of the eval plan (§6): the 12 deterministic architecture scenarios A1-A12. A scripted
/// gateway injects a KNOWN correct or wrong candidate; the real runtime, policies, guards and
/// Kernel must then accept the right thing, block the wrong thing, and leave the right state
/// behind. No model is called, so a failure here is never a prompt problem.
///
/// Tests suffixed <c>_KnownGap</c> are characterizations: they pin the CURRENT behaviour where it
/// deviates from the plan's expectation, so the deviation is visible in the report and the test
/// flips when it is fixed.
/// </summary>
public class ArchitectureFeasibilityTests(ITestOutputHelper output)
{
    private const string Tomorrow = "2026-09-15";
    private static readonly DateOnly TomorrowDate = new(2026, 9, 15);

    private static IReadOnlySet<ConversationStrategy> Strategies(params ConversationStrategy[] strategies) =>
        strategies.ToHashSet();

    private static AiCoachEvalHarness Harness(AiCoachMode mode, params string[] scripted) =>
        new(mode, new ScriptedGateway(scripted));

    // ======================================================================
    // 6.1 Execution
    // ======================================================================

    [Fact]
    public async Task A1_DirectInstruction_BecomesAPendingCard_NeverAFormalTask()
    {
        const string user = "帮我安排明天早上跑步";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "我建议明早七点跑半小时，你可以在卡片里调整。",
            [Candidate.Proposal("跑步", Tomorrow, "07:00", "07:30")],
            planningItems: [Candidate.Item("跑步", "明天早上跑步")],
            actionRequest: ("direct_instruction", user)));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A1", "正确的直接行动指令", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1, ExpectedDates: [TomorrowDate],
                ExpectedStartTime: new TimeOnly(7, 0), ExpectedDurationMinutes: 30),
            [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true, HasOpenQuestion: false)), result));

        result.Outcome!.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        result.Outcome.FallbackUsed.Should().BeFalse();
        result.StateAfter.AllowedActions.Should().Contain(
            [ConversationAction.AddToTaskList, ConversationAction.StartNow, ConversationAction.RejectDraft],
            because: "the card waits for the user's confirm — the model never creates a task");
        harness.Conversation.CurrentProposalSet!.Proposals.Should().OnlyContain(p => p.PersistedTaskId == null);
    }

    [Fact]
    public async Task A2_PastBehaviourMisreadAsTask_CardIsBlocked_WhenSignalsAreHonest()
    {
        // The model's strategy is wrong (a card for "I didn't run yesterday, what do you think?")
        // but its signals are honest: an action mention plus a perspective request.
        const string user = "我昨天没去跑步，你觉得呢？";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "那我帮你安排明天跑步吧。",
            [Candidate.Proposal("跑步", Tomorrow, "07:00", "07:30")],
            intent: "question",
            planningItems: [Candidate.Item("跑步", "没去跑步")],
            actionRequest: ("action_mention", "昨天没去跑步"),
            supportRequest: ("wants_perspective", "你觉得呢", "turn")));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A2", "过去行为被错误识别为任务", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
            QuestionExpectation.Allowed, ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));

        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.ExplicitActionIntentRequired);
        result.StateAfter.ActivePlanningIntent.Should().BeNull(because: "an action mention creates no planning intent");
        result.AssistantMessage.Should().NotBeEmpty(because: "the user still gets a reply, not an internal error");
    }

    [Fact]
    public async Task A2b_PastBehaviourWithFabricatedDirectInstruction_CardIsAccepted_KnownGap()
    {
        // KNOWN GAP (MODEL_INTERPRETATION dependency): Evidence Guard verifies that an
        // actionRequest quote EXISTS in the current message, not that it MEANS an instruction.
        // In Execution mode (ProposalTrigger = ActionAvailable) a verified action item plus a
        // direct_instruction claim quoting any substring ("你觉得呢") is enough for a card.
        const string user = "我昨天没去跑步，你觉得呢？";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "那我帮你安排明天跑步吧。",
            [Candidate.Proposal("跑步", Tomorrow, "07:00", "07:30")],
            planningItems: [Candidate.Item("跑步", "没去跑步")],
            actionRequest: ("direct_instruction", "你觉得呢")));

        var result = await harness.RunTurnAsync(user);

        Record("A2b", "过去行为 + 虚假 direct_instruction（已知缺口）", harness,
            [Gap("A2b.T1.PROPOSAL_FORBIDDEN", "no proposal for a past-behaviour opinion request",
                $"{result.Outcome!.AcceptedProposals?.Count ?? 0} proposal(s) accepted — guards trust the model's actionRequest kind")]);
        result.Outcome.AcceptedProposals.Should().HaveCount(1,
            because: "current behaviour: the server cannot tell a fabricated instruction kind from a real one when the quote is literal");
    }

    [Fact]
    public async Task A3_FabricatedEvidence_GrantsNoAuthority()
    {
        const string user = "我最近有点累";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "排好了！",
            [Candidate.Proposal("跑步", Tomorrow, "07:00", "07:30")],
            planningItems: [Candidate.Item("跑步", "帮我安排明天跑步")],
            actionRequest: ("direct_instruction", "帮我安排明天跑步")));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A3", "模型虚构 Evidence", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskClarifyingQuestion),
            QuestionExpectation.Allowed, ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));

        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid);
        result.Outcome.PlanningIntentUpdate.Should().BeNull(because: "fabricated claims never become planning state");
        result.StateAfter.ActivePlanningIntent.Should().BeNull();
    }

    [Fact]
    public async Task A3b_OneUnverifiableConstraintClaim_DropsAWhollyValidCard_WithoutRegeneration_KnownGap()
    {
        // KNOWN GAP (EVIDENCE_GUARD + POST_POLICY) — reproduces live failures E1/E6 deterministically.
        // Item and direct instruction are verified and the card is correct, but ONE constraint
        // claim is off by a character ("明天下午三点整" vs quote "明天下午三点"). Since 249d2cca the
        // Post-Policy DOWNGRADES on any invalid claim instead of requesting a regeneration, so the
        // user gets a canned apology and the regeneration budget is never used.
        const string user = "帮我安排明天下午三点整理论文资料，做半小时。";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "可以，我先给你放一个可编辑的安排草稿。",
            [Candidate.Proposal("整理论文资料", Tomorrow, "15:00", "15:30")],
            planningItems: [Candidate.Item("整理论文资料", "整理论文资料")],
            constraints: [Candidate.Constraint("明天下午三点整", "明天下午三点"), Candidate.Constraint("做半小时", "做半小时")],
            actionRequest: ("direct_instruction", user)));

        var result = await harness.RunTurnAsync(user);

        Record("A3b", "一条约束 claim 不可验证 → 整张有效卡片被丢弃（已知缺口）", harness,
            [Gap("A3b.T1.PROPOSAL_REQUIRED", "the verified card, or one regeneration to fix the claim",
                $"{result.Outcome!.FinalStrategy} ({result.Outcome.DecisionType}/{result.Outcome.ReasonCode}) "
                + $"regenerations={result.ModelResult.RegenerationCount}: \"{result.AssistantMessage}\"")]);
        result.Outcome.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid);
        result.Outcome.DecisionType.Should().Be(StrategyDecisionType.Downgraded,
            because: "current behaviour: no regeneration is requested (ConversationPolicyTests expects RequiresRegeneration here)");
        result.Outcome.AcceptedProposals.Should().BeNull(because: "current behaviour: the whole card is discarded");
        result.ModelResult.RegenerationCount.Should().Be(0);
    }

    [Fact]
    public async Task A4_DelegationAfterOneQuestion_RepeatedQuestionIsConvertedIntoAProposal()
    {
        const string user = "不知道，你帮我列出可能需要做的事情。";
        var repeated = Candidate.ClarifyingQuestion("你想先做哪一件？", "你想先做哪一件？",
            disposition: ("delegated_to_coach", "你帮我列出可能需要做的事情"),
            actionRequest: ("explicit_planning_request", "你帮我列出可能需要做的事情"));
        var card = Candidate.ProposalSet(
            "我先列了两步，你可以在卡片里调整。",
            [
                Candidate.Proposal("整理论文资料", Tomorrow, "09:00", "10:00", clientProposalKey: "p1"),
                Candidate.Proposal("写摘要初稿", "2026-09-16", "09:00", "10:00", clientProposalKey: "p2"),
            ],
            disposition: ("delegated_to_coach", "你帮我列出可能需要做的事情"),
            actionRequest: ("explicit_planning_request", "你帮我列出可能需要做的事情"));
        var harness = Harness(AiCoachMode.Execution, repeated, card);
        ScriptedTurns.SeedExecutionGoalWithOpenQuestion(harness);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A4", "用户委托后模型重复提问", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 2), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true, HasOpenQuestion: false)), result));

        result.ModelCalls.Should().HaveCount(2, because: "policy demands one bounded regeneration instead of the repeated question");
        result.ModelResult.RegenerationCount.Should().Be(1);
        result.ModelCalls[1].Request.Messages.OfType<GatewaySystemMessage>()
            .Should().Contain(m => m.Content.Contains("show_proposal_set"),
                because: "the regeneration directive names the required strategy");
        result.StateAfter.ActivePlanningIntent!.Status.Should().Be(PlanningIntentStatus.ProposalPending);
        result.StateAfter.OpenQuestion.Should().BeNull(because: "the consumed question is cleared with the card");
    }

    [Fact]
    public async Task A4b_DelegationAndModelRepeatsTwice_DeterministicFallbackStillProducesACard()
    {
        // Without constraints on the intent, the deterministic generator can build a safe card
        // from the goal after the regeneration budget is spent.
        const string user = "不知道，你帮我列出可能需要做的事情。";
        var repeated = Candidate.ClarifyingQuestion("你想先做哪一件？", "你想先做哪一件？",
            disposition: ("delegated_to_coach", "你帮我列出可能需要做的事情"),
            actionRequest: ("explicit_planning_request", "你帮我列出可能需要做的事情"));
        var harness = Harness(AiCoachMode.Execution, repeated, repeated);
        ScriptedTurns.SeedExecutionGoalWithOpenQuestion(harness, withConstraint: false);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A4b", "委托 + 模型两次重复提问 → 确定性兜底卡片", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true, HasOpenQuestion: false)), result));

        result.ModelCalls.Should().HaveCount(2);
        result.Outcome!.FallbackUsed.Should().BeTrue();
        result.Outcome.ReasonCode.Should().Be(StrategyReasonCode.ActionableIntentRequiresProposal);
        result.Outcome.AcceptedProposals![0].Title.Should().Be("开始探索：论文摘要",
            because: "the deterministic generator only consumes the verified goal");
    }

    [Fact]
    public async Task A4c_DelegationWithAConstraint_ModelRepeatsTwice_UserGetsAnApology_KnownGap()
    {
        // KNOWN GAP (FALLBACK): DeterministicProposalGenerator declines whenever the intent carries
        // ANY constraint ("两周内"), so after the model wastes its regeneration the turn ends with
        // a canned apology — no card, no question — even though the user delegated.
        const string user = "不知道，你帮我列出可能需要做的事情。";
        var repeated = Candidate.ClarifyingQuestion("你想先做哪一件？", "你想先做哪一件？",
            disposition: ("delegated_to_coach", "你帮我列出可能需要做的事情"),
            actionRequest: ("explicit_planning_request", "你帮我列出可能需要做的事情"));
        var harness = Harness(AiCoachMode.Execution, repeated, repeated);
        ScriptedTurns.SeedExecutionGoalWithOpenQuestion(harness, withConstraint: true);

        var result = await harness.RunTurnAsync(user);

        Record("A4c", "委托 + 约束 + 模型两次重复提问（已知缺口）", harness,
            [Gap("A4c.T1.PROPOSAL_REQUIRED", "a card from the delegated goal",
                $"{result.Outcome!.FinalStrategy} ({result.Outcome.ReasonCode}) fallback={result.Outcome.FallbackUsed}: \"{result.AssistantMessage}\"")]);
        result.Outcome.AcceptedProposals.Should().BeNull(because: "current behaviour: constraints block the deterministic fallback");
        result.Outcome.Question.Should().BeNull(because: "the repeated question is still blocked — that part works");
        result.Outcome.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening);
        result.StateAfter.Phase.Should().Be(ConversationPhase.Conversing);
    }

    [Fact]
    public async Task A5_DateCorrectionOverAPendingCard_NoSecondCard_CardStaysPending()
    {
        var harness = Harness(AiCoachMode.Execution);
        var seeded = await ScriptedTurns.ExecutionPendingCard(harness,
            "帮我安排周一整理资料", "整理资料", "周一整理资料", "2026-09-21", "09:00", "09:30");
        seeded.StateAfter.Phase.Should().Be(ConversationPhase.ActionPending);
        var cardId = seeded.StateAfter.CurrentProposalSet!.Id;

        // Wrong: the model regenerates a card (Tuesday) while one is already pending.
        const string user = "不要周一，周二可以。";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.ProposalSet(
            "好，改到周二。",
            [Candidate.Proposal("整理资料", "2026-09-22", "09:00", "09:30")],
            constraints: [Candidate.Constraint("周二", "周二可以")],
            actionRequest: ("referenced_instruction", "周二可以")));

        AssertCase("A5", "用户纠正日期约束", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.DiscussExistingProposal),
            QuestionExpectation.Forbidden, ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        result.StateAfter.CurrentProposalSet!.Id.Should().Be(cardId, because: "the pending card is neither replaced nor abandoned");
        result.StateAfter.CurrentProposalSet.Status.Should().Be(ProposalSetStatus.Pending);
        result.StateAfter.CurrentProposalSet.Proposals[0].Date.Should().Be(new DateOnly(2026, 9, 21),
            because: "v1 keeps card edits client-local: the model never rewrites the card (AllowsModelProposalSetUpdates=false)");
    }

    [Fact]
    public async Task A5b_DateCorrectionLabelledAsRejection_AbandonsTheWholeCard_KnownGap()
    {
        // KNOWN GAP (CONVERSATION_STATE / MODEL_INTERPRETATION): "不要周一" is a partial
        // correction, but if the model reports disposition=rejected_action with that literal quote
        // the server abandons the intent and clears the pending card — nothing distinguishes
        // "not Monday" from "not at all".
        var harness = Harness(AiCoachMode.Execution);
        await ScriptedTurns.ExecutionPendingCard(harness,
            "帮我安排周一整理资料", "整理资料", "周一整理资料", "2026-09-21", "09:00", "09:30");

        const string user = "不要周一，周二可以。";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.Listening(
            "好，那就不安排周一了。",
            intent: "concrete_action",
            supportMove: null,
            disposition: ("rejected_action", "不要周一")));

        Record("A5b", "日期纠正被标为 rejected_action（已知缺口）", harness,
            [Gap("A5b.T1.STATE_PENDING_SET", "the pending card survives a partial correction",
                $"set after turn: {result.StateAfter.CurrentProposalSet?.Status.ToString() ?? "cleared"}, phase={result.StateAfter.Phase}")]);
        result.StateAfter.CurrentProposalSet.Should().BeNull(because: "current behaviour: a verified rejected_action abandons the card");
        result.StateAfter.ActivePlanningIntent!.Status.Should().Be(PlanningIntentStatus.Abandoned);
    }

    [Fact]
    public async Task A6_InvalidProposalPayloadTwice_DeterministicCardFromVerifiedIntent_NoPartialState()
    {
        const string user = "帮我安排明天早上跑步";
        var invalid = Candidate.ProposalSet(
            "排好了。",
            [Candidate.Proposal("跑步", Tomorrow, "08:00", "07:30")], // end before start
            planningItems: [Candidate.Item("跑步", "明天早上跑步")],
            actionRequest: ("direct_instruction", user));
        var harness = Harness(AiCoachMode.Execution, invalid, invalid);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A6", "不完整或非法 Proposal", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        result.ModelCalls.Should().HaveCount(2, because: "one bounded payload regeneration, then the deterministic generator");
        result.ModelResult.ProposalRegenerationCount.Should().Be(1);
        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.ProposalSetInvalid);
        result.Outcome.FallbackUsed.Should().BeTrue();
        result.Outcome.AcceptedProposals![0].Title.Should().Be("跑步", because: "only the verified item is used");
        result.Outcome.AcceptedProposals[0].EndTime.Should().BeAfter(result.Outcome.AcceptedProposals[0].StartTime);
    }

    [Fact]
    public async Task A6b_UnparseableOutputTwice_TurnFailsCleanly_NothingIsPersisted()
    {
        const string user = "帮我安排明天早上跑步";
        var harness = Harness(AiCoachMode.Execution, "not json", "still not json");

        var result = await harness.RunTurnAsync(user);

        result.ModelResult.CompletionReason.Should().Be(ModelTurnCompletionReason.InvalidModelResponse);
        result.ModelResult.ModelCallCount.Should().Be(2, because: "exactly one schema correction is allowed (v3 §21)");
        result.Transition.IsAccepted.Should().BeTrue(because: "ModelTurnFailed is a legal Kernel event");
        result.StateAfter.GenerationStatus.Should().Be(GenerationStatus.Idle, because: "a transient failure lets the user retry");
        result.StateAfter.Phase.Should().Be(ConversationPhase.Conversing);
        result.StateAfter.CurrentProposalSet.Should().BeNull();
        harness.Conversation.Messages.Should().ContainSingle(m => m.Role == ConversationMessageRole.User,
            because: "no assistant message and no partial candidate leaks into the conversation");
        harness.Conversation.Messages.Should().NotContain(m => m.Role == ConversationMessageRole.Assistant);
        result.StateAfter.AllowedActions.Should().BeEquivalentTo([ConversationAction.SendMessage]);

        Record("A6b", "非法输出两次 → 干净失败", harness,
            [new EvalCheckResult("A6b.T1.CLEAN_FAILURE", "CONVERSATION_STATE", CheckSeverity.Hard, true,
                "InvalidModelResponse, Idle, no partial state", $"{result.ModelResult.CompletionReason}, {result.StateAfter.GenerationStatus}")]);
    }

    // ======================================================================
    // 6.2 Companion
    // ======================================================================

    [Fact]
    public async Task A7_EmotionalExpressionWithAnUnauthorizedCard_CardIsDropped()
    {
        const string user = "我今天真的很累。";
        var harness = Harness(AiCoachMode.Companion, Candidate.ProposalSet(
            "那明天休息半小时吧，我帮你排好了。",
            [Candidate.Proposal("休息半小时", Tomorrow, "20:00", "20:30")],
            intent: "emotional",
            supportMove: "offer_advice"));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A7", "普通情绪表达被错误生成 Proposal", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
            ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));

        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.ExplicitActionIntentRequired);
        result.StateAfter.ActivePlanningIntent.Should().BeNull(because: "emotion creates no planning intent");
    }

    [Fact]
    public async Task A8_ActionMention_IsNotAuthorization()
    {
        const string user = "明天可能得跑步，但现在完全不想动。";
        var harness = Harness(AiCoachMode.Companion, Candidate.ProposalSet(
            "我先做了一张跑步的卡。",
            [Candidate.Proposal("跑步", Tomorrow, "08:00", "08:30")],
            planningItems: [Candidate.Item("跑步", "明天可能得跑步")],
            actionRequest: ("action_mention", "明天可能得跑步"),
            supportMove: "reflect"));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A8", "Action Mention 被错误视为授权", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
            ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));

        result.StateAfter.ActivePlanningIntent.Should().BeNull(because: "Companion does not retain ordinary mentions");
    }

    [Fact]
    public async Task A9_CurrentTurnDirectInstruction_MayCreateAPendingCard()
    {
        const string user = "那你帮我安排明天早上跑步吧。";
        var harness = Harness(AiCoachMode.Companion, Candidate.ProposalSet(
            "我建议明早八点跑半小时，你可以在卡片里调整。",
            [Candidate.Proposal("跑步", Tomorrow, "08:00", "08:30")],
            planningItems: [Candidate.Item("跑步", "明天早上跑步")],
            actionRequest: ("direct_instruction", "帮我安排明天早上跑步"),
            supportMove: "acknowledge"));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A9", "当前 Turn 的直接行动指令", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1, ExpectedDates: [TomorrowDate]), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        result.Outcome!.DecisionType.Should().Be(StrategyDecisionType.Accepted, because: "Companion must not block an explicit request");
        result.StateAfter.AllowedActions.Should().Contain([ConversationAction.AddToTaskList, ConversationAction.RejectDraft]);
        harness.Conversation.CurrentProposalSet!.Proposals.Should().OnlyContain(p => p.PersistedTaskId == null);
    }

    [Fact]
    public async Task A10_ListeningRequest_ModelStillAsks_QuestionIsRegeneratedAway()
    {
        const string user = "你听我说就好，先别问。";
        var asks = Candidate.GentleQuestion("发生了什么？", "发生了什么？",
            supportRequest: ("wants_listening", "你听我说就好", "turn"));
        var listens = Candidate.Listening("好，我在这儿，你慢慢说。", supportMove: "acknowledge",
            supportRequest: ("wants_listening", "你听我说就好", "turn"));
        var harness = Harness(AiCoachMode.Companion, asks, listens);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A10", "用户要求只听，模型继续提问", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
            ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasSupportPreference: false)), result));

        result.ModelCalls.Should().HaveCount(2, because: "the question is repaired through one regeneration");
        result.Outcome!.FallbackUsed.Should().BeFalse();
        result.AssistantMessage.Should().Be("好，我在这儿，你慢慢说。");
        result.StateAfter.CompanionContext.Should().BeNull(because: "a turn-scoped request never becomes a lasting preference");
    }

    [Fact]
    public async Task A10b_ListeningRequest_ModelAsksTwice_FallbackHasNoQuestion()
    {
        const string user = "你听我说就好，先别问。";
        var asks = Candidate.GentleQuestion("发生了什么？", "发生了什么？",
            supportRequest: ("wants_listening", "你听我说就好", "turn"));
        var harness = Harness(AiCoachMode.Companion, asks, asks);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A10b", "只听请求 + 模型两次提问 → 无问题兜底", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
            ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasSupportPreference: false)), result));

        result.Outcome!.FallbackUsed.Should().BeTrue();
        result.Outcome.Question.Should().BeNull();
        QuestionQualityEvaluator.CountQuestionMarks(result.AssistantMessage).Should().Be(0,
            because: "the fallback catalog must not sneak a question back in");
    }

    [Fact]
    public async Task A11_SecondConsecutiveQuestion_IsBlockedByPolicy_NotByPrompt()
    {
        var harness = Harness(AiCoachMode.Companion);
        var first = await ScriptedTurns.CompanionGentleQuestion(harness, "我今天心情不太好。", "是发生了什么事吗？");
        first.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.AskGentleQuestion, because: "a first gentle question is allowed");

        const string user = "就是觉得做什么都没劲。";
        var asksAgain = Candidate.GentleQuestion("这种没劲的感觉通常什么时候最明显？", "这种没劲的感觉通常什么时候最明显？");
        var listens = Candidate.Listening("听起来不是某一件事，而是整个人都提不起劲。");
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, asksAgain, listens);

        AssertCase("A11", "连续两轮提问", harness,
            (new EvalTurn("我今天心情不太好。", Strategies(ConversationStrategy.AskGentleQuestion), QuestionExpectation.Required,
                ProposalExpectation.Forbidden, [], []), first),
            (new EvalTurn(user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden, [], [], new StateExpectation(ConversationPhase.Conversing)), result));

        result.PreviousAssistantQuestion.Should().Be("是发生了什么事吗？",
            because: "the Kernel keeps the assistant strategy on the message — the state model, not the prompt, remembers the question");
        result.ModelCalls.Should().HaveCount(2);
        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.None, because: "the repaired listening reply is accepted as-is");
        result.ModelCalls[0].Request.SystemPrompt.Should().Contain("Default to a substantive non-question reply",
            because: "the cadence context reaches the model before it answers");
    }

    [Fact]
    public async Task A12_TemporaryPause_ThenAdviceRequest_PauseIsNotPersisted_AdviceIsAccepted()
    {
        var harness = Harness(AiCoachMode.Companion);
        var paused = await ScriptedTurns.RunScriptedAsync(harness, "先别问了。", Candidate.Listening(
            "好，我先停下来。", supportMove: "respect_pause",
            supportRequest: ("wants_pause", "先别问了", "turn")));
        paused.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening);
        paused.StateAfter.CompanionContext.Should().BeNull(because: "a pause is temporary and never stored as a preference");

        const string user = "你现在可以给我一点建议。";
        const string advice = "可以。先把今天最重要的一件事缩到二十分钟，做完再说。";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.Listening(
            advice, intent: "question", supportMove: "offer_advice",
            actionRequest: ("advice_request", "给我一点建议"),
            supportRequest: ("wants_advice", "给我一点建议", "turn")));

        AssertCase("A12", "临时暂停后恢复建议", harness,
            (new EvalTurn("先别问了。", Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden, [], [], new StateExpectation(HasSupportPreference: false)), paused),
            (new EvalTurn(user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden, [], [], new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));

        result.Outcome!.DecisionType.Should().Be(StrategyDecisionType.Accepted, because: "the current advice request overrides last turn's pause");
        result.AssistantMessage.Should().Be(advice);
        result.Outcome.FallbackUsed.Should().BeFalse();
    }

    [Fact]
    public async Task A12b_AdviceRequestAnsweredWithACard_CardIsDropped()
    {
        const string user = "你现在可以给我一点建议。";
        var harness = Harness(AiCoachMode.Companion, Candidate.ProposalSet(
            "建议你明天早上先跑步。",
            [Candidate.Proposal("跑步", Tomorrow, "08:00", "08:30")],
            intent: "question",
            actionRequest: ("advice_request", "给我一点建议"),
            supportRequest: ("wants_advice", "给我一点建议", "turn"),
            supportMove: "offer_advice"));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A12b", "仅请求建议时不生成 Proposal", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening), QuestionExpectation.Forbidden,
            ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));
    }

    // ======================================================================
    // helpers
    // ======================================================================

    private void AssertCase(string id, string title, AiCoachEvalHarness harness, params (EvalTurn Expectation, EvalTurnResult Result)[] turns)
    {
        var checks = turns.SelectMany(t => EvalChecks.Evaluate(id, t.Expectation, t.Result, harness.Mode)).ToList();
        Record(id, title, harness, checks);

        var failures = EvalChecks.HardFailures(checks).ToList();
        if (failures.Count > 0)
        {
            foreach (var turn in turns)
                for (var i = 0; i < turn.Result.ModelCalls.Count; i++)
                    output.WriteLine($"  raw model output T{turn.Result.TurnIndex} #{i + 1}: {turn.Result.ModelCalls[i].RawOutput}");
        }

        failures.Should().BeEmpty($"{id} ({title}) is a deterministic architecture contract");
    }

    private void Record(string id, string title, AiCoachEvalHarness harness, IReadOnlyList<EvalCheckResult> checks)
    {
        var record = EvalRunRecorder.Build(id, title, harness.Mode.Mode, "scripted", 1, harness, checks);
        EvalRunRecorder.Record(record);
        output.WriteLine($"{id} [{record.Status}] {title}");
        foreach (var message in harness.Conversation.Messages)
            output.WriteLine($"  {(message.Role == ConversationMessageRole.User ? "U" : "A")}: {message.Content}");
        foreach (var check in checks.Where(c => !c.Passed))
            output.WriteLine($"  {check}");
    }

    /// <summary>A failed hard check that documents a known gap rather than failing the suite.</summary>
    private static EvalCheckResult Gap(string id, string expected, string actual) =>
        new(id, "KNOWN_GAP", CheckSeverity.Hard, false, expected, actual);
}
