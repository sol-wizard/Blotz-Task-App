using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>Operational eligibility only. Never classifies user intent or dictates a reply.</summary>
public static class OperationPolicy
{
    public static bool CanStartOperation(Conversation conversation) =>
        !conversation.EndedAt.HasValue && !conversation.RunningTurnId.HasValue && !conversation.Drafts.Any(IsSaving);
    public static bool IsSaving(ProposalSet draft) => draft.Status == ProposalSetStatus.Processing;
    public static bool CanEdit(ProposalSet draft) => draft.Status == ProposalSetStatus.Pending;
    public static bool CanEditItem(TaskProposal item) => !item.IsSaved;

    public static string? DraftOperationError(ProposalSet draft) =>
        CanEdit(draft) ? null : "Draft is not editable.";

    public static IReadOnlyList<string> DraftActions(ProposalSet draft, bool sessionAvailable)
    {
        if (!sessionAvailable || !CanEdit(draft)) return [];
        return ["edit_draft", "add_all", "reject_draft"];
    }
}
