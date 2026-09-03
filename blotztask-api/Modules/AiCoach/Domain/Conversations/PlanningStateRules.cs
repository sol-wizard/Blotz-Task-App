namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The single deterministic planning state vocabulary shared by Runtime, Policy and Kernel.
/// AI output may suggest an interpretation, but it cannot advance this state by itself.
/// </summary>
public static class PlanningStateRules
{
    public static PlanningIntentStatus NextIntentStatus(
        PlanningIntentStatus current,
        Planning.PlanningDecision decision,
        bool proposalAccepted) =>
        proposalAccepted
            ? PlanningIntentStatus.ProposalPending
            : decision.Readiness == Planning.PlanningReadiness.ReadyForProposal
                ? PlanningIntentStatus.ReadyForProposal
                : current == PlanningIntentStatus.ProposalPending
                    ? current
                    : PlanningIntentStatus.Collecting;
}
