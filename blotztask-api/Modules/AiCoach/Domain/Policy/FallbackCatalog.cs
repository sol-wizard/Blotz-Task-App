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
                ? "当前草案还在，你可以随时编辑或拒绝它，也可以继续聊。新的卡片需要在当前草案处理后生成。"
                : "Your draft is still available to edit or dismiss, and we can keep talking. A new card can be made once this one is resolved.";
        }

        if (reason == StrategyReasonCode.PauseRequested)
            return chinese ? "好，我先停下来。" : "Okay, I’ll pause here.";

        if (reason == StrategyReasonCode.UserRejectedAction)
            return chinese ? "好，先不继续这项安排。" : "Okay, we won't continue planning that.";

        if (reason is StrategyReasonCode.SupportMoveNotAllowed
            or StrategyReasonCode.AdviceNotRequested
            or StrategyReasonCode.QuestionCadenceExhausted)
        {
            return chinese
                ? "我在听，你可以按自己的节奏继续说。"
                : "I'm listening; continue at your own pace.";
        }

        if (!allowQuestion)
        {
            return chinese
                ? "抱歉，这次没能形成合适的回复。你可以继续说明或稍后重试。"
                : "Sorry, I could not produce a suitable response this time. You can continue or try again shortly.";
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
