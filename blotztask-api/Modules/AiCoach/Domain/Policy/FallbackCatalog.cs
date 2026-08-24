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
    public static string For(StrategyReasonCode reason, string? lastUserMessage)
    {
        var chinese = ContainsCjk(lastUserMessage);
        return reason switch
        {
            StrategyReasonCode.PendingProposalSetAlreadyExists => chinese
                ? "当前这张卡片还在等你确认，可以先保存或删掉它，我再帮你安排新的。"
                : "The current card is still waiting for you — save or reject it first, then I'll set up the next one.",

            StrategyReasonCode.ProposalSetMissing or StrategyReasonCode.ProposalSetInvalid => chinese
                ? "你希望安排在什么时候？"
                : "When would you like to schedule it?",

            StrategyReasonCode.ExplicitActionIntentRequired or StrategyReasonCode.EvidenceInvalid => chinese
                ? "你想先做哪件具体的事？"
                : "Which concrete thing do you want to start with?",

            _ => chinese
                ? "抱歉，我刚才没处理好。再说一次你想安排什么？"
                : "Sorry, I didn't get that quite right — what would you like to plan?",
        };
    }

    private static bool ContainsCjk(string? text) =>
        !string.IsNullOrEmpty(text) && text.Any(c =>
            (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0x3000 && c <= 0x303F));
}
