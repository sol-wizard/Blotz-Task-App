namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The single deterministic planning state vocabulary shared by Runtime, Policy and Kernel.
/// AI output may suggest an interpretation, but it cannot advance this state by itself.
/// </summary>
public static class PlanningStateRules
{
    public static PlanningIntentStatus NextIntentStatus(
        PlanningIntentStatus current,
        ClarificationResolution? clarification,
        bool proposalAccepted) =>
        proposalAccepted
            ? PlanningIntentStatus.ProposalPending
            : clarification is not null
                ? PlanningIntentStatus.ReadyForProposal
                : current;

    public static bool CanGenerateProposal(ConversationSnapshot snapshot) =>
        snapshot.OpenQuestion is null
        && snapshot.ActivePlanningIntent is { Items.Count: > 0, Status: PlanningIntentStatus.ReadyForProposal } intent
        && (intent.CanSupportProposal || intent.HasExplicitActionIntent);
}
