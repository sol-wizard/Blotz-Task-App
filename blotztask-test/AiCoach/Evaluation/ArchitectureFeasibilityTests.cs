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
    public async Task A3_FabricatedEvidence_StillGrantsAuthority_WhileSourceValidationIsPaused_KnownGap()
    {
        // KNOWN GAP (EVIDENCE_GUARD, deliberate and temporary): since 2026-09-15 the quote-in-
        // message check in Guards.TryVerifyQuote is commented out ("Source validation is
        // intentionally disabled for now", v3 tech design §1.1.2/§14.1). A quote the user never
        // said therefore verifies, so a wholly fabricated direct instruction creates a card from
        // "我最近有点累". The contract this test used to pin — fabricated evidence grants NO
        // authority — is the one to restore when source validation is switched back on.
        // ReferencedInstruction is unaffected: it still goes through TryVerifyCurrentMessageQuote.
        const string user = "我最近有点累";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "排好了！",
            [Candidate.Proposal("跑步", Tomorrow, "07:00", "07:30")],
            planningItems: [Candidate.Item("跑步", "帮我安排明天跑步")],
            actionRequest: ("direct_instruction", "帮我安排明天跑步")));

        var result = await harness.RunTurnAsync(user);

        Record("A3", "模型虚构 Evidence（来源校验暂停中，已知缺口）", harness,
            [Gap("A3.T1.PROPOSAL_FORBIDDEN", "no proposal from a quote the user never said",
                $"{result.Outcome!.AcceptedProposals?.Count ?? 0} proposal(s): "
                + $"{EvalChecks.Describe(result.Outcome.AcceptedProposals ?? [])} — TryVerifyQuote no longer checks the source")]);
        result.Outcome.FinalStrategy.Should().Be(ConversationStrategy.ShowProposalSet);
        result.Outcome.ReasonCode.Should().Be(StrategyReasonCode.None,
            because: "current behaviour: with source validation paused nothing is EvidenceInvalid");
        result.Outcome.AcceptedProposals.Should().HaveCount(1);
        result.StateAfter.ActivePlanningIntent.Should().NotBeNull(
            because: "current behaviour: the fabricated item becomes planning state");
    }

    [Fact]
    public async Task A3c_FabricatedReferencedInstruction_IsStillRejected()
    {
        // The half of source validation that is still on: a referenced_instruction must quote the
        // CURRENT message AND name a planning reference key the server projected this turn.
        const string user = "我最近有点累";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "那就照上次说的安排吧。",
            [Candidate.Proposal("跑步", Tomorrow, "07:00", "07:30")],
            planningItems: [Candidate.Item("跑步", "帮我安排明天跑步")],
            actionRequest: ("referenced_instruction", "帮我安排明天跑步"),
            referencedItemKey: "planning_item_1"));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A3c", "虚构的 referenced_instruction", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion,
                ConversationStrategy.AskClarifyingQuestion),
            QuestionExpectation.Allowed, ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)), result));

        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid,
            because: "the quote is not in the current message and the reference key was never projected");
    }

    [Fact]
    public async Task A3b_OneOffConstraintQuote_KeepsTheWhollyValidCard()
    {
        // This case reproduced live failures E1/E6 deterministically: ONE constraint claim off by
        // a character ("明天下午三点整" vs quote "明天下午三点") used to make Post-Policy downgrade
        // and throw away a correct card (249d2cca). It passes again — but only because source
        // validation is paused (see A3), not because the downgrade-instead-of-regenerate path was
        // fixed. When the quote check is switched back on, re-run this and E1/E6 first:
        // ConversationPolicyTests.PostPolicy_InvalidCurrentClaimWithActiveIntent_RejectsModelProposal
        // still encodes the old downgrade behaviour.
        const string user = "帮我安排明天下午三点整理论文资料，做半小时。";
        var harness = Harness(AiCoachMode.Execution, Candidate.ProposalSet(
            "可以，我先给你放一个可编辑的安排草稿。",
            [Candidate.Proposal("整理论文资料", Tomorrow, "15:00", "15:30")],
            planningItems: [Candidate.Item("整理论文资料", "整理论文资料")],
            constraints: [Candidate.Constraint("明天下午三点整", "明天下午三点"), Candidate.Constraint("做半小时", "做半小时")],
            actionRequest: ("direct_instruction", user)));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A3b", "一条约束 quote 对不上，仍保留整张有效卡片", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1, ExpectedDates: [TomorrowDate],
                ExpectedStartTime: new TimeOnly(15, 0), ExpectedDurationMinutes: 30), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        result.Outcome!.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        result.ModelResult.RegenerationCount.Should().Be(0, because: "a correct card needs no repair");
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
        // Since 38e8b80e the repair steers to a non-question reply, no longer to show_proposal_set:
        // the card here survives only because the scripted second candidate happens to be one.
        // A4b covers what happens when it is not. Recorded as a soft signal, not a hard contract.
        var directive = result.ModelCalls[1].Request.Messages.OfType<GatewaySystemMessage>()
            .FirstOrDefault(m => m.Content.Contains("continue_listening") || m.Content.Contains("show_proposal_set"));
        Record("A4.directive", "委托后重生成指令的目标策略", harness,
        [
            new EvalCheckResult("A4.T1.REPAIR_TARGET", "POLICY_REPAIR", CheckSeverity.Soft,
                directive?.Content.Contains("show_proposal_set") == true,
                "the regeneration directive names show_proposal_set for a delegated planning request",
                directive?.Content.Contains("continue_listening") == true
                    ? "continue_listening (38e8b80e removed RegenerateProposal(ActionableIntentRequiresProposal))"
                    : directive?.Content ?? "no directive found"),
        ]);
        result.StateAfter.ActivePlanningIntent!.Status.Should().Be(PlanningIntentStatus.ProposalPending);
        result.StateAfter.OpenQuestion.Should().BeNull(because: "the consumed question is cleared with the card");
    }

    [Fact]
    public async Task A4b_DelegationAndModelRepeatsTwice_DeterministicFallbackStillProducesACard()
    {
        // Without constraints on the intent, the deterministic generator can build a safe card
        // from the goal after the regeneration budget is spent.
        //
        // REGRESSION (open, owner: Chen): 38e8b80e removed the Post-Policy branch that turned an
        // unauthorized planning question into RegenerateProposal(ActionableIntentRequiresProposal).
        // A repeated question now takes the RegenerateResponse(ClarificationSlotAlreadyAsked) path
        // to ContinueListening, so a user who explicitly delegated gets a canned apology and no
        // card — the behaviour Ben ruled out on 2026-08-24. e03b16f9 re-added a proposal repair,
        // but only for ProposalDisposition.Required (Clarify exhaustion); Execution delegation is
        // Optional, so it never fires. Live counterpart: E6. This test stays RED on purpose.
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
    public async Task A11_SecondConsecutiveQuestion_IsAllowedByPolicy_AndSteeredByThePrompt()
    {
        // Companion cadence is a PREFERENCE, not a veto: SupportDecision hands the model the full
        // move set and the frame says "around N consecutive question turn(s), not a hard limit"
        // (v3 tech design §13, Ben confirmed 2026-09-20). What the server still enforces hard is
        // one question per turn and no repeat of the previous one — see A11b.
        // CompanionPolicyTests.Handle_UnspecifiedRequestAfterQuestion_DisallowsAnotherQuestion and
        // CompanionModeRuntimeTests.Handle_SecondGentleQuestion_... still assert the old hard rule.
        var harness = Harness(AiCoachMode.Companion);
        var first = await ScriptedTurns.CompanionGentleQuestion(harness, "我今天心情不太好。", "是发生了什么事吗？");
        first.Outcome!.FinalStrategy.Should().Be(ConversationStrategy.AskGentleQuestion, because: "a first gentle question is allowed");

        const string user = "就是觉得做什么都没劲。";
        const string second = "这种没劲的感觉通常什么时候最明显？";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.GentleQuestion(second, second));

        AssertCase("A11", "连续两轮提问（cadence 为软偏好）", harness,
            (new EvalTurn("我今天心情不太好。", Strategies(ConversationStrategy.AskGentleQuestion), QuestionExpectation.Required,
                ProposalExpectation.Forbidden, [], []), first),
            (new EvalTurn(user, Strategies(ConversationStrategy.AskGentleQuestion), QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden, [], [], new StateExpectation(ConversationPhase.Conversing)), result));

        result.PreviousAssistantQuestion.Should().Be("是发生了什么事吗？",
            because: "the Kernel keeps the assistant strategy on the message — the state model, not the prompt, remembers the question");
        result.ModelCalls.Should().HaveCount(1, because: "a different, non-repeated question needs no repair");
        result.Outcome!.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        result.ModelCalls[0].Request.SystemPrompt.Should().Contain("consecutive question turn",
            because: "the cadence preference still reaches the model before it answers");
    }

    [Fact]
    public async Task A11b_RepeatingThePreviousQuestionVerbatim_IsAccepted_KnownGap()
    {
        // KNOWN GAP (POST_POLICY + RESPONSE_GUARD): with Companion cadence reduced to a preference
        // (38e8b80e), nothing on the server stops the model from asking LAST TURN'S QUESTION
        // WORD FOR WORD. The Kernel does remember it (PreviousAssistantQuestion below), so the
        // check is cheap to add; today only the prompt discourages it. Execution is not affected:
        // there a spent clarification topic is tracked on the planning intent.
        var harness = Harness(AiCoachMode.Companion);
        const string asked = "是发生了什么事吗？";
        var first = await ScriptedTurns.CompanionGentleQuestion(harness, "我今天心情不太好。", asked);
        first.Outcome!.Question.Should().Be(asked);

        const string user = "就是觉得做什么都没劲。";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.GentleQuestion(asked, asked));

        Record("A11b", "重复上一轮的同一个问题（已知缺口）", harness,
            [Gap("A11b.T2.QUESTION_REPEAT", $"not a repeat of \"{asked}\"",
                $"\"{result.Outcome!.Question}\" accepted as-is ({result.Outcome.DecisionType}/{result.Outcome.ReasonCode})")]);
        result.PreviousAssistantQuestion.Should().Be(asked, because: "the state model does remember it");
        result.Outcome.Question.Should().Be(asked, because: "current behaviour: the verbatim repeat reaches the user");
        result.Outcome.DecisionType.Should().Be(StrategyDecisionType.Accepted);
        result.ModelCalls.Should().HaveCount(1, because: "no repair is attempted");
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
    // 6.3 Clarify (mode registered 2026-09-19, e03b16f9 — clarification-planning-v3)
    // ======================================================================

    [Fact]
    public async Task A13_ClarifyVagueGoal_OneFocusedQuestion_NoCard_BudgetConsumed()
    {
        // Clarify only drafts once the context is complete or the budget is spent. A first
        // question is the normal move, and it must cost exactly one of the two attempts.
        //
        // OPEN DEFECT (owner: Chen) — this test is RED on e03b16f9. A plain goal with no explicit
        // request trips `unrequestedNarration` in PlanningAuthorityCalculator (actionRequest none
        // + disposition not_applicable + context not yet draftable), which returns
        // CurrentRequestIsConversational with Clarification = NotAllowed. Post-Policy then
        // downgrades Clarify's own core move to a canned apology. A13b shows the inversion: with
        // NO verified material the same question IS allowed. Live counterpart: L1.
        const string user = "我最近挺乱的，想把事情理一理。";
        var harness = Harness(AiCoachMode.Clarify, Candidate.ClarifyingQuestion(
            "我们先从一块开始。", "现在最让你乱的是哪一块？", topic: "scope",
            planningItems: [Candidate.Item("把事情理一理", "想把事情理一理", "goal")]));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A13", "Clarify 模糊目标 → 一个聚焦问题", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.AskClarifyingQuestion),
            new QuestionExpectation(QuestionPolicy.Required, ClarificationTopic.Scope),
            ProposalExpectation.Forbidden, [], [],
            new StateExpectation(ConversationPhase.ActionPreparing, HasPendingProposalSet: false, HasOpenQuestion: true)), result));

        result.StateAfter.ActivePlanningIntent!.ClarificationAttempts.Should().Be(1,
            because: "a submitted planning question costs exactly one of the two attempts");
        harness.Mode.Policy.Planning.MaxClarificationAttempts.Should().Be(2);
    }

    [Fact]
    public async Task A13b_ClarifyFirstQuestion_IsUnauthorizedInEveryOpeningShape_KnownGap()
    {
        // KNOWN GAP (PLANNING_AUTHORITY), the cause behind A13: `unrequestedNarration` fires for
        // any opening message that carries no actionRequest and no disposition — with or without
        // planning material — so Clarify cannot ask its FIRST question at all. Everything after
        // the first question works (A15 seeds that state and passes), which makes this a
        // chicken-and-egg: the state Clarify needs can only be reached by seeding it.
        const string user = "我最近挺乱的。";
        var withoutMaterial = Harness(AiCoachMode.Clarify, Candidate.ClarifyingQuestion(
            "我们先从一块开始。", "现在最让你乱的是哪一块？", topic: "scope"));
        var bare = await withoutMaterial.RunTurnAsync(user);

        var withGoal = Harness(AiCoachMode.Clarify, Candidate.ClarifyingQuestion(
            "我们先从一块开始。", "现在最让你乱的是哪一块？", topic: "scope",
            planningItems: [Candidate.Item("把事情理一理", "我最近挺乱的", "goal")]));
        var goal = await withGoal.RunTurnAsync(user);

        Record("A13b", "Clarify 的第一个问题在任何开场形态下都不被授权（已知缺口）", withoutMaterial,
            [Gap("A13b.T1.QUESTION_AUTHORITY", "Clarify may ask its first clarifying question",
                $"no material -> {bare.Outcome!.FinalStrategy} ({bare.Outcome.ReasonCode}); "
                + $"stated goal -> {goal.Outcome!.FinalStrategy} ({goal.Outcome.ReasonCode})")]);
        bare.Outcome.FinalStrategy.Should().Be(ConversationStrategy.ContinueListening);
        bare.Outcome.ReasonCode.Should().Be(StrategyReasonCode.PlanningQuestionNotAuthorized);
        goal.Outcome.ReasonCode.Should().Be(StrategyReasonCode.PlanningQuestionNotAuthorized);
        bare.AssistantMessage.Should().NotBeEmpty(because: "the user still gets a reply, not an internal error");
    }

    [Fact]
    public async Task A14_ClarifyGoalCurrentStateAndTopic_AuthorizesATentativeCard()
    {
        // DraftContextPolicy.TargetScopeAndGrounding: goal + current state + topic is enough for
        // a PENDING draft even without an explicit planning request (v3 §13 Clarify row 3).
        const string user = "我想两周内写完论文摘要，现在只写了提纲，就是论文这块。";
        var harness = Harness(AiCoachMode.Clarify, Candidate.ProposalSet(
            "先放一个可以改的起点。",
            [Candidate.Proposal("扩写论文摘要提纲", Tomorrow, "09:00", "09:30")],
            intent: "goal",
            planningItems:
            [
                Candidate.Item("写完论文摘要", "两周内写完论文摘要", "goal"),
                Candidate.Item("论文", "就是论文这块", "domain"),
            ],
            constraints: [Candidate.Constraint("只写了提纲", "现在只写了提纲")]));

        var result = await harness.RunTurnAsync(user);

        AssertCase("A14", "Clarify 上下文完整 → 暂定卡", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, MaxCount: 3), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        harness.Conversation.CurrentProposalSet!.Proposals.Should().OnlyContain(p => p.PersistedTaskId == null,
            because: "a tentative draft is still only a Pending artifact");
    }

    [Fact]
    public async Task A15_ClarifyBudgetSpentWithMaterial_ThirdQuestionBecomesATentativeCard()
    {
        // ClarificationExhaustionBehavior.RequireTentativeProposal: after two submitted planning
        // questions the server stops asking. A third question is repaired into a draft built from
        // the material already verified (e03b16f9 added RegenerateProposal(RequiredProposalMissing)).
        const string user = "我也说不好，反正就是乱。";
        var asksAgain = Candidate.ClarifyingQuestion("那我们再缩小一点。", "你希望先从哪天开始？",
            topic: "deadline", disposition: ("cannot_provide", "我也说不好"));
        var card = Candidate.ProposalSet(
            "那我先给你一个可以改的起点。",
            [Candidate.Proposal("整理论文进度", Tomorrow, "09:00", "09:30")],
            intent: "goal",
            disposition: ("cannot_provide", "我也说不好"));
        var harness = Harness(AiCoachMode.Clarify, asksAgain, card);
        ScriptedTurns.SeedClarifyExhaustedClarifications(harness, topic: "论文");

        var result = await harness.RunTurnAsync(user);

        AssertCase("A15", "Clarify 两问用尽 + 有材料 → 暂定卡", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, MaxCount: 3), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true, HasOpenQuestion: false)), result));

        result.ModelResult.ProposalRegenerationCount.Should().Be(1,
            because: "the required proposal is asked for once, not simply downgraded away");
    }

    [Fact]
    public async Task A16_ClarifyBudgetSpentWithoutMaterial_NeverInventsAGoal()
    {
        // The other half of the exhaustion rule: no verified planning material means no draft,
        // however insistent the model is. Nothing may be invented to fill the gap.
        const string user = "我也说不上来。";
        var harness = Harness(AiCoachMode.Clarify, Candidate.ProposalSet(
            "那我先安排你明天整理一下吧。",
            [Candidate.Proposal("整理一下", Tomorrow, "09:00", "09:30")],
            intent: "unknown",
            disposition: ("cannot_provide", "我也说不上来")));
        ScriptedTurns.SeedClarifyExhaustedClarifications(harness, withMaterial: false);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A16", "Clarify 两问用尽 + 无材料 → 不造目标", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
            QuestionExpectation.Forbidden, ProposalExpectation.Forbidden, [], [],
            new StateExpectation(HasPendingProposalSet: false)), result));

        result.StateAfter.CurrentProposalSet.Should().BeNull(because: "nothing verified, nothing drafted");
    }

    [Fact]
    public async Task A17_ClarifyPlanningReference_OnlyTheSelectedItemIsPlanned()
    {
        // Schema 6 planningReferences: "就先做第一个" selects a retained item by its ephemeral
        // frame key, and only the selected item may reach the draft (v3 §1.1.4).
        const string user = "就先做第一个吧，你帮我排。";
        var harness = Harness(AiCoachMode.Clarify, Candidate.ProposalSet(
            "好，先排这一件。",
            [Candidate.Proposal("写论文摘要", Tomorrow, "09:00", "09:30")],
            disposition: ("answered", "就先做第一个吧"),
            actionRequest: ("explicit_planning_request", "你帮我排"),
            planningReferences: [Candidate.Reference("planning_item_1", "selected", "就先做第一个吧")]));
        ScriptedTurns.SeedClarifyTwoOpenItems(harness);

        var result = await harness.RunTurnAsync(user);

        AssertCase("A17", "Clarify 选中其中一项", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.ShowProposalSet), QuestionExpectation.Forbidden,
            new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1), [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        result.Outcome!.AcceptedProposals![0].Title.Should().Be("写论文摘要");
        result.StateAfter.ActivePlanningIntent!.Items
            .Should().Contain(item => item.Text == "写论文摘要" && item.Status == PlanningItemStatus.Selected)
            .And.Contain(item => item.Text == "投实习简历" && item.Status != PlanningItemStatus.Selected);
    }

    [Fact]
    public async Task A17b_UnknownPlanningReferenceKey_FailsClosed()
    {
        // A key the server never projected is an invalid claim, not a silently ignored one.
        const string user = "就先做第一个吧，你帮我排。";
        var harness = Harness(AiCoachMode.Clarify, Candidate.ProposalSet(
            "好，先排这一件。",
            [Candidate.Proposal("写论文摘要", Tomorrow, "09:00", "09:30")],
            disposition: ("answered", "就先做第一个吧"),
            actionRequest: ("explicit_planning_request", "你帮我排"),
            planningReferences: [Candidate.Reference("planning_item_9", "selected", "就先做第一个吧")]));
        ScriptedTurns.SeedClarifyTwoOpenItems(harness);

        var result = await harness.RunTurnAsync(user);

        Record("A17b", "Clarify 引用了不存在的 key", harness, []);
        result.Outcome!.ReasonCode.Should().Be(StrategyReasonCode.EvidenceInvalid,
            because: "an unknown reference key is an invalid claim");
        result.StateAfter.ActivePlanningIntent!.Items
            .Should().OnlyContain(item => item.Status == PlanningItemStatus.Active,
                because: "no item may be marked selected from an unverifiable reference");
    }

    [Fact]
    public async Task A18_ClarifyPendingCard_ExplicitEdit_UpdatesInPlace_NoSecondCard()
    {
        // Clarify has AllowsModelProposalSetUpdates = true since e03b16f9: an unambiguous edit is
        // applied to the CURRENT card instead of creating a second one.
        var harness = Harness(AiCoachMode.Clarify);
        await ScriptedTurns.ClarifyPendingCard(harness);
        var setId = harness.Conversation.CurrentProposalSet!.Id;

        const string user = "改成下午四点。";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.UpdateProposalSet(
            "已经把时间挪到下午四点，你看这样行不行。",
            [Candidate.UpdateOperation("item_1", ["start_time", "end_time"], user,
                startTime: "16:00", endTime: "16:30")]));

        AssertCase("A18", "Clarify 明确修改 Pending 卡片", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.UpdateProposalSet), QuestionExpectation.Forbidden,
            ProposalExpectation.Allowed, [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        var set = harness.Conversation.CurrentProposalSet!;
        set.Id.Should().Be(setId, because: "the pending card is edited, never replaced");
        set.Proposals.Should().ContainSingle();
        set.Proposals[0].StartTime.Should().Be(new TimeOnly(16, 0));
        set.Proposals[0].Title.Should().Be("写论文摘要", because: "fields outside changedFields stay untouched");
        result.Outcome!.AcceptedProposalSetMutation!.Summary!.UpdatedCount.Should().Be(1);
    }

    [Fact]
    public async Task A18b_ClarifyPendingCard_AmbiguousEdit_AsksInsteadOfGuessing()
    {
        // The other half of §1.1.4: an ambiguous edit is clarified, never partially applied.
        var harness = Harness(AiCoachMode.Clarify);
        await ScriptedTurns.ClarifyPendingCard(harness);
        var before = harness.Conversation.CurrentProposalSet!.Proposals[0];

        const string user = "那个改一下吧。";
        var result = await ScriptedTurns.RunScriptedAsync(harness, user, Candidate.AmbiguousProposalSetUpdate(
            "我想确认一下再改。", "你是想改时间还是改内容？",
            [Candidate.Ambiguity("field_unclear", ["item_1"], "那个改一下吧")]));

        AssertCase("A18b", "Clarify 歧义修改 → 只澄清", harness, (new EvalTurn(
            user, Strategies(ConversationStrategy.AskClarifyingQuestion, ConversationStrategy.DiscussExistingProposal,
                ConversationStrategy.ContinueListening),
            QuestionExpectation.Allowed, ProposalExpectation.Allowed, [], [],
            new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)), result));

        var after = harness.Conversation.CurrentProposalSet!.Proposals[0];
        after.Should().BeEquivalentTo(before, because: "an ambiguous request never applies part of an edit");
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
