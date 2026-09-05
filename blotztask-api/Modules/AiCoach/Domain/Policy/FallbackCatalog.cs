namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>
/// Finite deterministic fallback texts (v3 tech design §15): when a candidate is downgraded and
/// its text cannot be reused, the turn still ends in a short, safe reply instead of an error.
/// Fallbacks only carry short questions/notes — they never attempt rich coaching language.
///
/// Locale handling for v1 is deliberately minimal (§28.7): two variants, chosen by whether the
/// user's last message contains CJK characters.
/// </summary>
public static class FallbackCatalog
{
    public static string For(
        StrategyReasonCode reason,
        string? lastUserMessage,
        bool allowQuestion = true)
    {
        var chinese = ContainsCjk(lastUserMessage);
        if (reason == StrategyReasonCode.PendingProposalSetAlreadyExists)
        {
            return chinese
                ? "当前卡片还在等待处理。你可以先调整、确认或删除它，我再继续添加新的安排。"
                : "The current card is still waiting. Adjust, confirm, or delete it first, then I can add more plans.";
        }

        if (reason == StrategyReasonCode.NoNewPlanningMaterial)
        {
            return chinese
                ? "我先保留了当前目标。要继续安排时间，还需要一个具体的工作事项。"
                : "I kept the current goal. To schedule time, I still need one specific work item.";
        }

        if (reason == StrategyReasonCode.UserRejectedAction)
        {
            return chinese
                ? "好的，先不安排这项活动。当前安排已停止，之后想继续时再告诉我。"
                : "Okay, I will not schedule this activity for now. The current arrangement is stopped; tell me when you want to continue.";
        }

        if (!allowQuestion)
        {
            return chinese
                ? "我暂时还不能确认具体安排。当前目标已保留，请补充一个具体事项或明确让我代为安排。"
                : "I cannot confirm a specific plan yet. The current goal is kept; add one concrete item or clearly ask me to arrange it.";
        }

        return reason switch
        {
            StrategyReasonCode.ProposalSetMissing or StrategyReasonCode.ProposalSetInvalid => chinese
                ? "你希望安排在什么时候？"
                : "When would you like to schedule it?",

            StrategyReasonCode.ExplicitActionIntentRequired or StrategyReasonCode.EvidenceInvalid => chinese
                ? "我还不能确认要安排的具体内容。请换一种说法，或直接让我给一个保守建议。"
                : "I could not verify what to schedule. Rephrase it, or ask me to make a conservative suggestion.",

            _ => chinese
                ? "抱歉，我刚才没处理好。再说一次你想安排什么？"
                : "Sorry, I didn't get that quite right — what would you like to plan?",
        };
    }

    private static bool ContainsCjk(string? text) =>
        !string.IsNullOrEmpty(text) && text.Any(c =>
            (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0x3000 && c <= 0x303F));
}
