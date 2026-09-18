using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Layer 2, Execution mode (eval plan §7.1): E1-E8 against the deployed model through the real
/// pipeline. Fixed "now" is Monday 2026-09-14 10:00 Sydney, so 明天 = 2026-09-15.
/// Run with AICOACH_EVAL_RUNS=3 for the stability pass on E4/E6/E7/E8 (§11.2).
/// </summary>
[Collection(AiCoachLiveModelCollection.Name)]
public class ExecutionModeEvalTests(ITestOutputHelper output) : LiveEvalTestBase(output)
{
    private static readonly DateOnly Tomorrow = new(2026, 9, 15);
    private static readonly DateOnly DayAfterTomorrow = new(2026, 9, 16);

    [Fact]
    public Task E1_ExplicitSingleTask_OneCardWithTheGivenTimeAndDuration() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E1", "明确单任务", AiCoachMode.Execution,
        [
            new EvalTurn("帮我安排明天下午三点整理论文资料，做半小时。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1, ExpectedDates: [Tomorrow],
                    ExpectedStartTime: new TimeOnly(15, 0), ExpectedDurationMinutes: 30),
                MustAddress: [],
                MustNotDo: ["追问用户已经给出的时间或时长"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]));

    [Fact]
    public Task E2_TwoExplicitTasks_OneCardWithTwoItemsInOrder() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E2", "多个明确任务", AiCoachMode.Execution,
        [
            new EvalTurn("明天上午去买菜，后天下午整理房间。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 2, ExpectedDates: [Tomorrow, DayAfterTomorrow]),
                MustAddress: [],
                MustNotDo: [],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]));

    [Fact]
    public Task E3_BroadGoal_ConservativeSmallStart_NotALongList() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E3", "宽泛目标", AiCoachMode.Execution,
        [
            new EvalTurn("我想改善自己的生活安排。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, MaxCount: 3),
                MustAddress: ["给出一个保守、可逆的小起点"],
                MustNotDo: ["把全部决定推回给用户", "列出很长的任务清单"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true),
                ReplyMustNotContain: ["哪件具体的事"]),
        ]));

    [Fact]
    public Task E4_PastBehaviourAndOpinionRequest_NoCard() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E4", "过去行为和观点请求", AiCoachMode.Execution,
        [
            new EvalTurn("我昨天没去跑步，你觉得呢？",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion,
                    ConversationStrategy.AskClarifyingQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["回应用户对昨天没去跑步的看法请求"],
                MustNotDo: ["安排跑步任务", "把过去的行为当成新任务"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task E5_NegatedAction_NoCard_RespondsToTheFeeling() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E5", "否定行动", AiCoachMode.Execution,
        [
            new EvalTurn("我不想安排跑步，我只是觉得最近状态不好。",
                Strategies(ConversationStrategy.ContinueListening, ConversationStrategy.AskGentleQuestion,
                    ConversationStrategy.AskClarifyingQuestion),
                QuestionExpectation.Allowed,
                ProposalExpectation.Forbidden,
                MustAddress: ["用户最近状态不好"],
                MustNotDo: ["安排跑步", "推动用户创建任务"],
                new StateExpectation(ConversationPhase.Conversing, HasPendingProposalSet: false)),
        ]));

    [Fact]
    public Task E6_DelegationAfterOneQuestion_CardNotTheSameQuestion() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E6", "用户委托规划", AiCoachMode.Execution,
        [
            new EvalTurn("不知道，你帮我列一下可能要做的事情。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, MaxCount: 4),
                MustAddress: ["接过用户的委托，给出可执行的第一步"],
                MustNotDo: ["再次问用户想先做哪一件"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true, HasOpenQuestion: false),
                ReplyMustNotContain: ["哪件具体的事"]),
        ]),
        seed: harness =>
        {
            // Turn 1 seeded: goal "两周内完成论文摘要" + one clarifying question already asked.
            ScriptedTurns.SeedExecutionGoalWithOpenQuestion(harness);
            return Task.CompletedTask;
        });

    [Fact]
    public Task E7_DateCorrection_NoSecondCard_NotTreatedAsRejection() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E7", "纠正日期约束", AiCoachMode.Execution,
        [
            new EvalTurn("帮我安排周一整理资料。",
                Strategies(ConversationStrategy.ShowProposalSet),
                QuestionExpectation.Forbidden,
                new ProposalExpectation(ProposalPolicy.Required, ExpectedCount: 1),
                MustAddress: [],
                MustNotDo: [],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
            // v1 keeps card edits client-local (AllowsModelProposalSetUpdates=false): the plan's
            // "新方案使用周二" is not reachable; the contract here is no second card, no abandonment.
            new EvalTurn("不是周一，改成周二。",
                Strategies(ConversationStrategy.DiscussExistingProposal, ConversationStrategy.ContinueListening),
                QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden,
                MustAddress: ["用户想把安排改到周二"],
                MustNotDo: ["把纠正理解为放弃整个安排", "声称已经改好或已保存"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]));

    [Fact]
    public Task E8_TopicChangeWhileACardIsPending_PlainReply_CardUntouched() =>
        RunLiveCaseAsync(new AiCoachEvalCase("E8", "Pending Proposal 时换话题", AiCoachMode.Execution,
        [
            new EvalTurn("先不管这个，你觉得我今天是不是太累了？",
                Strategies(ConversationStrategy.DiscussExistingProposal, ConversationStrategy.ContinueListening),
                QuestionExpectation.Forbidden,
                ProposalExpectation.Forbidden,
                MustAddress: ["回应用户是否太累的问题"],
                MustNotDo: ["要求用户先确认或拒绝卡片", "再生成一张卡片"],
                new StateExpectation(ConversationPhase.ActionPending, HasPendingProposalSet: true)),
        ]),
        seed: harness => ScriptedTurns.ExecutionPendingCard(harness));
}
