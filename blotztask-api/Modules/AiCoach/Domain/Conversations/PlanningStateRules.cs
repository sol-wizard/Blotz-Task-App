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
        PlanningDecision planningDecision,
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

        // Historical action references are deliberately unavailable in Companion v1. Retaining
        // ordinary mentions would therefore add prompt noise without enabling a valid future
        // proposal, and can misclassify a narrated distraction as an intended task.
        if (mode == AiCoachMode.Companion
            && verifiedPlanning.ActionRequest?.Kind != ActionRequestKind.DirectInstruction
            && !planningQuestion)
        {
            return null;
        }

        var current = ReusableIntent(snapshot, verifiedPlanning);
        if (!proposalAccepted && !planningDecision.Allows(AllowedPlanningAction.GenerateProposal)
            && !planningDecision.Allows(AllowedPlanningAction.AskClarification))
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
                planningDecision,
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
            || current.Evidence.HasInvalidClaims
            || current.Disposition == UserTurnDisposition.RejectedAction)
            return null;

        if (current.ActionRequest?.Kind is Candidates.ActionRequestKind.AdviceRequest
            or Candidates.ActionRequestKind.ActionMention)
            return null;

        if (current.Disposition is UserTurnDisposition.Answered or UserTurnDisposition.CannotProvide
            || current.Disposition == UserTurnDisposition.DelegatedToCoach && current.Items.Count == 0)
            return snapshot.OpenQuestion?.PlanningIntentId == intent.IntentId ? intent : null;

        // Null is reserved for legacy, typed callers; parsed model requests always carry a kind.
        return current.ActionRequest is null ? intent : null;
    }

    public static PlanningIntentStatus NextIntentStatus(
        PlanningIntentStatus current,
        Planning.PlanningDecision decision,
        bool proposalAccepted) =>
        decision.Readiness == Planning.PlanningReadiness.Blocked
            ? PlanningIntentStatus.Abandoned
            : proposalAccepted
            ? PlanningIntentStatus.ProposalPending
            : decision.Readiness == Planning.PlanningReadiness.ReadyForProposal
                ? PlanningIntentStatus.ReadyForProposal
                : current == PlanningIntentStatus.ProposalPending
                    ? current
                    : PlanningIntentStatus.Collecting;
}
