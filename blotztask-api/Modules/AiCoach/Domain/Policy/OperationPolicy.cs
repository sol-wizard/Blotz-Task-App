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

    /// <summary>A start this recent still counts as now, so a task asked for "right now" stays saveable.</summary>
    public static readonly TimeSpan PastStartGrace = TimeSpan.FromMinutes(5);
    public static bool IsPastStart(DateTimeOffset start, DateTimeOffset now) => start < now - PastStartGrace;

    public static string? DraftOperationError(ProposalSet draft) =>
        CanEdit(draft) ? null : "Draft is not editable.";

    public static IReadOnlyList<string> DraftActions(ProposalSet draft, bool sessionAvailable)
    {
        if (!sessionAvailable || !CanEdit(draft)) return [];
        return draft.IsReviewList
            ? ["edit_draft", "set_item_added", "add_all", "reject_draft"]
            : ["edit_draft", "add_to_task_list", "reject_draft"];
    }
}
