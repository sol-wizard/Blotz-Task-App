namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>
/// The conversation strategies a model turn can end in (v3 tech design §8.1). Level-4 business
/// side effects (creating formal tasks, notifications, focus sessions…) are deliberately NOT
/// strategies — they are user commands and never enter the model's decision space.
/// </summary>
public enum ConversationStrategy
{
    ContinueListening = 0,
    AskGentleQuestion = 1,
    AskClarifyingQuestion = 2,
    AskUserToChooseGoal = 3,
    ShowProposalSet = 4,
    DiscussExistingProposal = 5,
    UpdateProposalSet = 6,
    SupersedeProposalSet = 7,
    CloseConversation = 8,
}

public static class ConversationStrategyExtensions
{
    /// <summary>Risk levels (v3 tech design §12.1). Policy may downgrade, never upgrade.</summary>
    public static int RiskLevel(this ConversationStrategy strategy) => strategy switch
    {
        ConversationStrategy.ContinueListening => 0,
        ConversationStrategy.AskGentleQuestion => 1,
        ConversationStrategy.AskClarifyingQuestion => 1,
        ConversationStrategy.AskUserToChooseGoal => 2,
        ConversationStrategy.DiscussExistingProposal => 1,
        ConversationStrategy.ShowProposalSet => 3,
        ConversationStrategy.UpdateProposalSet => 3,
        ConversationStrategy.SupersedeProposalSet => 3,
        ConversationStrategy.CloseConversation => 2,
        _ => throw new ArgumentOutOfRangeException(nameof(strategy), strategy, "Unmapped strategy"),
    };

    /// <summary>Strategies whose reply is (or contains) exactly one question to the user.</summary>
    public static bool AsksQuestion(this ConversationStrategy strategy) => strategy
        is ConversationStrategy.AskGentleQuestion
        or ConversationStrategy.AskClarifyingQuestion
        or ConversationStrategy.AskUserToChooseGoal;

    /// <summary>Model-output wire value (snake_case, mirrored in the JSON output schema).</summary>
    public static string ToWireValue(this ConversationStrategy strategy) => strategy switch
    {
        ConversationStrategy.ContinueListening => "continue_listening",
        ConversationStrategy.AskGentleQuestion => "ask_gentle_question",
        ConversationStrategy.AskClarifyingQuestion => "ask_clarifying_question",
        ConversationStrategy.AskUserToChooseGoal => "ask_user_to_choose_goal",
        ConversationStrategy.ShowProposalSet => "show_proposal_set",
        ConversationStrategy.DiscussExistingProposal => "discuss_existing_proposal",
        ConversationStrategy.UpdateProposalSet => "update_proposal_set",
        ConversationStrategy.SupersedeProposalSet => "supersede_proposal_set",
        ConversationStrategy.CloseConversation => "close_conversation",
        _ => throw new ArgumentOutOfRangeException(nameof(strategy), strategy, "Unmapped strategy"),
    };

    public static ConversationStrategy? FromWireValue(string value) => value switch
    {
        "continue_listening" => ConversationStrategy.ContinueListening,
        "ask_gentle_question" => ConversationStrategy.AskGentleQuestion,
        "ask_clarifying_question" => ConversationStrategy.AskClarifyingQuestion,
        "ask_user_to_choose_goal" => ConversationStrategy.AskUserToChooseGoal,
        "show_proposal_set" => ConversationStrategy.ShowProposalSet,
        "discuss_existing_proposal" => ConversationStrategy.DiscussExistingProposal,
        "update_proposal_set" => ConversationStrategy.UpdateProposalSet,
        "supersede_proposal_set" => ConversationStrategy.SupersedeProposalSet,
        "close_conversation" => ConversationStrategy.CloseConversation,
        _ => null,
    };
}
