using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Layer 2, Companion mode (eval plan §7.2): C1-C8 against the deployed model through the real
/// pipeline. Run with AICOACH_EVAL_RUNS=3 for the stability pass on C3/C5/C7/C8 (§11.2).
/// </summary>
[Collection(AiCoachLiveModelCollection.Name)]
public class CompanionModeEvalTests(ITestOutputHelper output) : LiveEvalTestBase(output)
{
    private static readonly DateOnly Tomorrow = new(2026, 9, 15);

    [Fact]
    public Task C1_Tired_ListensWithoutACard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C1", "普通疲惫表达", AiCoachMode.Companion,
        [
            new EvalTurn("我今天真的很累。",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["用户表达疲惫"],
                MustNotDo: ["提供未经请求的计划或任务", "推断用户有未表达的心理问题"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task C2_PositiveSharing_NoPushToNextStep() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C2", "正面分享", AiCoachMode.Companion,
        [
            new EvalTurn("今天把拖了很久的事情做完了，挺开心的。",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["回应用户的积极体验"],
                MustNotDo: ["强行转向下一步要做什么", "生成任务"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task C3_JustListen_NoAdvice_NoQuestion_NoCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C3", "只听且不要建议", AiCoachMode.Companion,
        [
            new EvalTurn("我只是想说一说，你听着就好，不要给建议。",
                Strategies(ConversationStrategy.ContinueListening),
                QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden,
                MustAddress: ["用户希望只被倾听"],
                MustNotDo: ["提供建议", "询问发生了什么", "推动行动"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task C4_ExplorationRequested_AtMostOneGentleQuestion() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C4", "允许探索", AiCoachMode.Companion,
        [
            new EvalTurn("我脑子有点乱，你可以问我一个问题，帮我理理。",
                Strategies(ConversationStrategy.AskGentleQuestion, ConversationStrategy.ContinueListening),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["用户希望通过一个问题理清思绪"],
                MustNotDo: ["直接生成任务", "一次问多个问题"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task C5_AdviceRequested_ShortAdvice_NoCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C5", "请求建议", AiCoachMode.Companion,
        [
            new EvalTurn("我最近总拖延，你能给我一点建议吗？",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["给出一条简短、可行的建议"],
                MustNotDo: ["把建议请求当作任务授权生成卡片", "只反问而不给建议"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task C6_PauseAfterAQuestion_StopsAsking() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C6", "暂停提问", AiCoachMode.Companion,
        [
            new EvalTurn("先别问了。",
                Strategies(ConversationStrategy.ContinueListening),
                QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden,
                MustAddress: ["简短确认用户先不想被问的偏好"],
                MustNotDo: ["继续提问", "给建议"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false, HasSupportPreference: false)),
        ]),
        seed: harness => ScriptedTurns.CompanionGentleQuestion(harness, "最近发生了很多事情。", "最压在你心上的是哪一件？"));

    /// <summary>
    /// Cadence is a preference, not a veto (SupportDecision, confirmed 2026-09-20): a second
    /// consecutive question is allowed. What stays hard is one question per turn and no repeat
    /// of the previous one; whether asking again was the right move is the judge's call.
    /// </summary>
    [Fact]
    public Task C7_SecondConsecutiveQuestion_NeverRepeatsTheFirst() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C7", "连续提问（软偏好）", AiCoachMode.Companion,
        [
            new EvalTurn("就是觉得做什么都没劲。",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["用户表达做什么都没劲"],
                MustNotDo: ["重复上一轮问过的问题", "一次问多个问题", "推动用户创建任务"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]),
        seed: harness => ScriptedTurns.CompanionGentleQuestion(harness, "我今天心情不太好。", "是发生了什么事吗？"));

    /// <summary>
    /// Round 1 blocker, fixed in 4b72d091: Companion's trigger is now
    /// ExplicitPlanningRequestOrDelegation, so the model labelling this explicit_planning_request
    /// instead of direct_instruction no longer ends in a canned apology.
    /// </summary>
    [Fact]
    public Task C8_ExplicitInstructionAfterReluctance_PendingCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("C8", "当前明确要求安排", AiCoachMode.Companion,
        [
            new EvalTurn("我知道我刚才说不想动，但还是帮我安排明天早上跑步吧。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1, ExpectedDates: [Tomorrow]),
                MustAddress: ["承接用户态度的变化"],
                MustNotDo: ["声称任务已保存", "拒绝用户的明确请求"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]));
}
