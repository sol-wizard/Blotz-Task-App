using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Planning;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The single deterministic planning state vocabulary shared by Runtime, Policy and Kernel.
/// AI output may suggest an interpretation, but it cannot advance this state by itself.
/// </summary>
public static class PlanningStateRules
{
    public static ActivePlanningIntentSnapshot? BuildPlanningIntentUpdate(
        ConversationSnapshot snapshot,
        VerifiedPlanningContext verifiedPlanning,
        PlanningAuthority planningAuthority,
        Guid? currentMessageId,
        bool proposalAccepted,
        AiCoachMode mode,
        bool planningQuestion = false)
    {
        if (currentMessageId is null)
            return null;

        if (verifiedPlanning.Disposition == UserTurnDisposition.RejectedAction)
            return snapshot.ActivePlanningIntent is { } rejected
                ? rejected with { Status = PlanningIntentStatus.Abandoned } : null;
        if (verifiedPlanning.Evidence.HasInvalidClaims)
            return null;

        var current = ReusableIntent(snapshot, verifiedPlanning);
        if (!proposalAccepted && !planningAuthority.CanAdvancePlanning)
            return null;
        if (current is null && verifiedPlanning.Items.Count == 0 && !planningQuestion)
            return null;

        var intentId = current?.IntentId ?? Guid.NewGuid();
        var sourceItems = verifiedPlanning.Items;
        var items = (current?.Items ?? [])
            .Concat(sourceItems.Select(item => new PlanningItemSnapshot(
                item.Text,
                item.EvidenceQuote,
                currentMessageId.Value,
                item.Kind)))
            .GroupBy(item => item.Text, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();
        var constraints = (current?.Constraints ?? [])
            .Concat(verifiedPlanning.Constraints.Select(constraint => new PlanningConstraintSnapshot(
                constraint.Text,
                constraint.EvidenceQuote,
                currentMessageId.Value)))
            .GroupBy(constraint => constraint.Text, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();

        return new ActivePlanningIntentSnapshot(
            intentId,
            current?.SourceMessageId ?? currentMessageId.Value,
            items,
            constraints,
            PlanningStateRules.NextIntentStatus(
                current?.Status ?? PlanningIntentStatus.Collecting,
                planningAuthority,
                proposalAccepted),
            current?.AskedTopics);
    }

    // A reply to the active question may reuse its material. A new explicit request with
    // new items starts afresh; unrelated conversation must not inherit automatic planning.
    public static ActivePlanningIntentSnapshot? ReusableIntent(
        ConversationSnapshot snapshot, Planning.VerifiedPlanningContext current)
    {
        if (snapshot.ActivePlanningIntent is not
            { Status: PlanningIntentStatus.Collecting or PlanningIntentStatus.ReadyForProposal } intent
            || current.Disposition == UserTurnDisposition.RejectedAction)
            return null;

        if (current.ActionRequest?.Kind is Candidates.ActionRequestKind.AdviceRequest
            or Candidates.ActionRequestKind.ActionMention)
            return null;

        // A current explicit planning request owns the turn even if the model also labels it as
        // an answer. With no new planning items, the active retained intent is its subject.
        if (current.ActionRequest?.Kind == Candidates.ActionRequestKind.ExplicitPlanningRequest
            && current.Items.Count == 0)
            return intent;

        if (current.Disposition is UserTurnDisposition.Answered or UserTurnDisposition.CannotProvide
            || current.Disposition == UserTurnDisposition.DelegatedToCoach && current.Items.Count == 0)
            return snapshot.OpenQuestion?.PlanningIntentId == intent.IntentId ? intent : null;

        // Null is reserved for legacy, typed callers; parsed model requests always carry a kind.
        return current.ActionRequest is null ? intent : null;
    }

    public static PlanningIntentStatus NextIntentStatus(
        PlanningIntentStatus current,
        Planning.PlanningAuthority authority,
        bool proposalAccepted) =>
        authority.IsBlocked
            ? PlanningIntentStatus.Abandoned
            : proposalAccepted
            ? PlanningIntentStatus.ProposalPending
            : authority.CanGenerateProposal
                ? PlanningIntentStatus.ReadyForProposal
                : current == PlanningIntentStatus.ProposalPending
                    ? current
                    : PlanningIntentStatus.Collecting;
}
