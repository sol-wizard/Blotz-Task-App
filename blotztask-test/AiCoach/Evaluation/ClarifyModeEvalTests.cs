using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Layer 2, Clarify mode: L1-L8 against the deployed model through the real pipeline. Clarify was
/// registered on 2026-09-19 (e03b16f9), so these cases encode v3 tech design §1.1.4 and the
/// Clarify rows of §13: at most one question per turn, at most TWO planning clarifications per
/// active intent, a tentative draft once goal + current state + topic are known or the budget is
/// spent, and never an invented goal when nothing was verified.
///
/// Fixed "now" is Monday 2026-09-14 10:00 Sydney, so 明天 = 2026-09-15.
/// Run with AICOACH_EVAL_RUNS=3 for the stability pass on L1/L3/L4/L7.
/// </summary>
[Collection(AiCoachLiveModelCollection.Name)]
public class ClarifyModeEvalTests(ITestOutputHelper output) : LiveEvalTestBase(output)
{
    private static readonly DateOnly Tomorrow = new(2026, 9, 15);

    /// <summary>
    /// Clarify's core move. Scripted counterpart A13 is RED on e03b16f9: `unrequestedNarration`
    /// in PlanningAuthorityCalculator withholds clarification authority for an opening message
    /// with no actionRequest and no disposition, so expect the canned fallback here until that
    /// is fixed. Kept as a hard contract on purpose — this is what the mode is for.
    /// </summary>
    [Fact]
    public Task L1_VagueOpening_OneFocusedQuestion_NoCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L1", "开场模糊", AiCoachMode.Clarify,
        [
            new EvalTurn("我最近挺乱的，想把事情理一理。",
                Strategies(ConversationStrategy.AskClarifyingQuestion, ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Required,
                ProposalExpectation.Forbidden,
                MustAddress: ["帮助用户缩小到一个具体的方面"],
                MustNotDo: ["一次问多个问题", "直接生成任务", "泛泛地安慰而不推进"],
                new StateExpectation(HasPendingProposalSet: false, HasOpenQuestion: true)),
        ]));

    /// <summary>
    /// DraftContextPolicy.TargetScopeAndGrounding: goal + current state + topic is enough for a
    /// tentative draft, with no explicit planning request from the user.
    /// </summary>
    [Fact]
    public Task L2_GoalCurrentStateAndTopic_TentativeDraft() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L2", "上下文完整", AiCoachMode.Clarify,
        [
            new EvalTurn("我想两周内写完论文摘要，现在只写了提纲，就卡在论文这块。",
                Strategies(ConversationStrategy.ShowProposalSet, ConversationStrategy.AskClarifyingQuestion),
                QuestionExpectation.Allowed,
                new ProposalExpectation(ProposalPolicy.Allowed, MaxCount: 3),
                MustAddress: ["承接用户现在只写了提纲的状态"],
                MustNotDo: ["声称任务已保存", "一次给出很长的清单"],
                new StateExpectation(HasPendingProposalSet: null)),
        ]));

    /// <summary>
    /// ClarificationExhaustionBehavior.RequireTentativeProposal: two planning questions are a
    /// ceiling. With material already verified the third turn must stop asking and offer a
    /// tentative, editable draft instead.
    /// </summary>
    [Fact]
    public Task L3_BudgetSpentWithMaterial_StopsAskingAndDrafts() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L3", "两问用尽 + 有材料", AiCoachMode.Clarify,
        [
            new EvalTurn("我也说不好，反正就是乱。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, MaxCount: 3),
                MustAddress: ["给出一个可以修改的起点", "说明这是暂定的、可以调整"],
                MustNotDo: ["继续追问", "把决定推回给用户", "声称任务已保存"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true, HasOpenQuestion: false)),
        ]),
        seed: harness =>
        {
            ScriptedTurns.SeedClarifyExhaustedClarifications(harness, topic: "论文");
            return Task.CompletedTask;
        });

    /// <summary>The other half of the exhaustion rule: an empty intent may never become a goal.</summary>
    [Fact]
    public Task L4_BudgetSpentWithoutMaterial_NoInventedGoal() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L4", "两问用尽 + 无材料", AiCoachMode.Clarify,
        [
            new EvalTurn("我也说不上来。",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["说明现在还无法给出具体安排"],
                MustNotDo: ["凭空给出一个目标或任务", "假装已经理解用户想做什么"],
                new StateExpectation(HasPendingProposalSet: false)),
        ]),
        seed: harness =>
        {
            ScriptedTurns.SeedClarifyExhaustedClarifications(harness, withMaterial: false);
            return Task.CompletedTask;
        });

    /// <summary>An explicit delegation is a planning request in Clarify too (ProposalTrigger = ExplicitPlanningRequestOrDelegation).</summary>
    [Fact]
    public Task L5_ExplicitDelegation_DraftInsteadOfAnotherQuestion() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L5", "明确委托", AiCoachMode.Clarify,
        [
            new EvalTurn("我说不清楚，你直接帮我拆成几步吧。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, MaxCount: 4),
                MustAddress: ["接过用户的委托"],
                MustNotDo: ["再问用户想先做哪一件", "把决定推回给用户"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]),
        seed: harness =>
        {
            ScriptedTurns.SeedClarifyExhaustedClarifications(harness, topic: "论文");
            return Task.CompletedTask;
        });

    /// <summary>
    /// Schema 6 planningReferences: picking one of two retained items must plan only that item.
    /// The other one stays in the intent but must not reach the card.
    /// </summary>
    [Fact]
    public Task L6_PicksOneOfTwoRetainedItems_OnlyThatItemIsPlanned() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L6", "在两项中选一项", AiCoachMode.Clarify,
        [
            new EvalTurn("先做第一个吧，论文那件，你帮我排。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, MaxCount: 2),
                MustAddress: ["确认先推进论文那一件"],
                MustNotDo: ["同时安排实习简历", "声称任务已保存"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true),
                ReplyMustNotContain: ["实习"]),
        ]),
        seed: harness =>
        {
            ScriptedTurns.SeedClarifyTwoOpenItems(harness);
            return Task.CompletedTask;
        });

    /// <summary>Clarify has AllowsModelProposalSetUpdates = true: an unambiguous edit changes the same card.</summary>
    [Fact]
    public Task L7_EditThePendingCard_UpdatesInPlace_NoSecondCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L7", "修改 Pending 卡片", AiCoachMode.Clarify,
        [
            new EvalTurn("改成下午四点吧。",
                Strategies(ConversationStrategy.UpdateProposalSet, ConversationStrategy.DiscussExistingProposal),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Allowed, MaxCount: 1),
                MustAddress: ["把时间改到下午四点"],
                MustNotDo: ["再生成一张新的卡片", "声称已经保存", "把修改理解为放弃整个安排"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]),
        seed: harness => ScriptedTurns.ClarifyPendingCard(harness));

    /// <summary>Clarify still respects "don't plan yet": understanding is not authorization.</summary>
    [Fact]
    public Task L8_UserDoesNotWantAPlanYet_NoCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("L8", "先别排，只想理清楚", AiCoachMode.Clarify,
        [
            new EvalTurn("先别给我排任务，我只是想把思路理清楚。",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskClarifyingQuestion,
                    ConversationStrategy.AskGentleQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["接受用户暂时不想被安排任务"],
                MustNotDo: ["生成任务卡片", "劝用户现在就安排"],
                new StateExpectation(HasPendingProposalSet: false)),
        ]),
        seed: harness =>
        {
            ScriptedTurns.SeedClarifyTwoOpenItems(harness);
            return Task.CompletedTask;
        });
}
