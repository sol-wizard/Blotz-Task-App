using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Planning;

public sealed record VerifiedPlanningContext(
    IReadOnlyList<VerifiedPlanningItem> Items,
    IReadOnlyList<VerifiedConstraint> Constraints,
    UserTurnDisposition Disposition,
    EvidenceSummary Evidence,
    VerifiedActionRequest? ActionRequest = null,
    VerifiedSupportRequest? SupportRequest = null);

public sealed record VerifiedActionRequest(
    ActionRequestKind Kind,
    string? EvidenceQuote);

public sealed record VerifiedSupportRequest(
    SupportRequestKind Kind,
    string? EvidenceQuote,
    SupportPreferenceScope Scope = SupportPreferenceScope.Turn);

public sealed record VerifiedPlanningItem(
    string Text,
    PlanningItemKind Kind,
    string EvidenceQuote);

public sealed record VerifiedConstraint(
    string Text,
    string EvidenceQuote);

public sealed record EvidenceSummary(
    int SubmittedClaims,
    int VerifiedClaims,
    IReadOnlyList<EvidenceIssue> Issues)
{
    public bool HasInvalidClaims => Issues.Count > 0;
}

public enum EvidenceIssue
{
    MissingQuote = 0,
    QuoteNotFound = 1,
    EmptyClaim = 2,
    ClaimNotSupportedByQuote = 3,
}

public enum PlanningReadiness
{
    Insufficient = 0,
    ReadyForClarification = 1,
    ReadyForSuggestion = 2,
    ReadyForProposal = 3,
    Blocked = 4,
}

public enum AllowedPlanningAction
{
    ContinueConversation = 0,
    AskClarification = 1,
    OfferSuggestion = 2,
    GenerateProposal = 3,
}

public enum PlanningDecisionReason
{
    NoVerifiedPlanningMaterial = 0,
    VerifiedActionAvailable = 1,
    ConservativeGoalProposalAllowed = 2,
    UserDelegatedPlanning = 3,
    SafeDefaultsAllowed = 4,
    ClarificationCanHelp = 5,
    UserRejectedAction = 6,
    EvidenceInvalid = 8,
    CurrentRequestIsConversational = 9,
    ExplicitActionRequestRequired = 7,
}

public enum AllowedAssumption
{
    CoachDecomposition = 0,
    DefaultDuration = 1,
    NextAvailableSlot = 2,
}

public sealed record PlanningDecision(
    PlanningReadiness Readiness,
    IReadOnlySet<AllowedPlanningAction> AllowedActions,
    IReadOnlyList<PlanningDecisionReason> Reasons,
    IReadOnlyList<AllowedAssumption> AllowedAssumptions)
{
    public bool Allows(AllowedPlanningAction action) => AllowedActions.Contains(action);
}

public sealed record PlanningReadinessContext(
    ConversationSnapshot Snapshot,
    VerifiedPlanningContext Verified,
    PlanningPolicyDefinition Policy);

public interface IPlanningReadinessCalculator
{
    PlanningDecision Calculate(PlanningReadinessContext context);
}

public sealed class PlanningReadinessCalculator : IPlanningReadinessCalculator
{
    public PlanningDecision Calculate(PlanningReadinessContext context)
    {
        var verified = context.Verified;
        var policy = context.Policy;

        if (verified.Disposition == UserTurnDisposition.RejectedAction)
        {
            return Decision(
                PlanningReadiness.Blocked,
                [AllowedPlanningAction.ContinueConversation],
                [PlanningDecisionReason.UserRejectedAction]);
        }

        if (verified.Evidence.HasInvalidClaims)
        {
            return Decision(PlanningReadiness.Insufficient,
                [AllowedPlanningAction.ContinueConversation], [PlanningDecisionReason.EvidenceInvalid]);
        }

        // A request for advice, a narration or a pause is not an instruction to schedule,
        // even if it contains an activity or an old intent is ready.
        if (verified.SupportRequest?.Kind == SupportRequestKind.WantsPause
            || verified.ActionRequest?.Kind == ActionRequestKind.None
                && verified.Disposition == UserTurnDisposition.NotApplicable
            || verified.ActionRequest?.Kind is ActionRequestKind.AdviceRequest or ActionRequestKind.ActionMention
            || verified.SupportRequest?.Kind is SupportRequestKind.WantsListening
                or SupportRequestKind.WantsPerspective or SupportRequestKind.WantsAdvice
                or SupportRequestKind.WantsPause or SupportRequestKind.RejectsAdvice
                && verified.ActionRequest?.Kind is not (ActionRequestKind.DirectInstruction
                    or ActionRequestKind.ExplicitPlanningRequest))
        {
            return Decision(PlanningReadiness.ReadyForSuggestion,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.OfferSuggestion],
                [PlanningDecisionReason.CurrentRequestIsConversational]);
        }

        var activeIntent = PlanningStateRules.ReusableIntent(context.Snapshot, verified);
        var clarificationAttempts = activeIntent?.AskedTopics?.Count ?? 0;
        var canAskClarification = clarificationAttempts < policy.MaxClarificationAttempts
                                  && context.Snapshot.OpenQuestion is null;
        var items = activeIntent?.Items
            .Select(item => item.Kind)
            .Concat(verified.Items.Select(item => item.Kind))
            .ToList() ?? verified.Items.Select(item => item.Kind).ToList();

        if (items.Count == 0)
        {
            if (policy.ProposalTrigger == ProposalTriggerPolicy.CurrentTurnDirectInstruction
                && verified.ActionRequest?.Kind != ActionRequestKind.DirectInstruction)
            {
                return Decision(
                    PlanningReadiness.ReadyForSuggestion,
                    [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.OfferSuggestion],
                    [PlanningDecisionReason.ExplicitActionRequestRequired]);
            }

            return canAskClarification
                ? Decision(
                    PlanningReadiness.ReadyForClarification,
                    [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.AskClarification],
                    [PlanningDecisionReason.NoVerifiedPlanningMaterial, PlanningDecisionReason.ClarificationCanHelp])
                : Decision(
                    PlanningReadiness.Insufficient,
                    [AllowedPlanningAction.ContinueConversation],
                    [PlanningDecisionReason.NoVerifiedPlanningMaterial]);
        }

        if (items.Contains(PlanningItemKind.Action)
            && ProposalTriggerSatisfied(policy.ProposalTrigger, verified))
        {
            return Decision(
                PlanningReadiness.ReadyForProposal,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.GenerateProposal],
                [PlanningDecisionReason.VerifiedActionAvailable],
                [AllowedAssumption.DefaultDuration, AllowedAssumption.NextAvailableSlot]);
        }

        if (items.Contains(PlanningItemKind.Action)
            && policy.ProposalTrigger == ProposalTriggerPolicy.CurrentTurnDirectInstruction)
        {
            return Decision(
                PlanningReadiness.ReadyForSuggestion,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.OfferSuggestion],
                [PlanningDecisionReason.ExplicitActionRequestRequired]);
        }

        if (verified.Disposition == UserTurnDisposition.DelegatedToCoach
            && policy.AllowCoachDecomposition)
        {
            return Decision(
                PlanningReadiness.ReadyForProposal,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.GenerateProposal],
                [PlanningDecisionReason.UserDelegatedPlanning],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (verified.Disposition == UserTurnDisposition.CannotProvide
            && policy.AllowSafeDefaultsWhenClarificationUnavailable)
        {
            return Decision(
                PlanningReadiness.ReadyForProposal,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.GenerateProposal],
                [PlanningDecisionReason.SafeDefaultsAllowed],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (policy.AllowConservativeGoalProposal)
        {
            return Decision(
                PlanningReadiness.ReadyForProposal,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.GenerateProposal],
                [PlanningDecisionReason.ConservativeGoalProposalAllowed],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        return canAskClarification
            ? Decision(
                PlanningReadiness.ReadyForSuggestion,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.OfferSuggestion,
                    AllowedPlanningAction.AskClarification],
                [PlanningDecisionReason.ClarificationCanHelp])
            : Decision(
                PlanningReadiness.ReadyForSuggestion,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.OfferSuggestion],
                [PlanningDecisionReason.ClarificationCanHelp]);
    }

    private static bool ProposalTriggerSatisfied(
        ProposalTriggerPolicy trigger,
        VerifiedPlanningContext verified) => trigger switch
    {
        ProposalTriggerPolicy.ActionAvailable => true,
        ProposalTriggerPolicy.ExplicitPlanningRequestOrDelegation =>
            verified.ActionRequest?.Kind is ActionRequestKind.ExplicitPlanningRequest
                or ActionRequestKind.DirectInstruction
                or ActionRequestKind.ReferencedInstruction
            || verified.Disposition == UserTurnDisposition.DelegatedToCoach,
        ProposalTriggerPolicy.CurrentTurnDirectInstruction =>
            verified.ActionRequest?.Kind == ActionRequestKind.DirectInstruction,
        _ => false,
    };

    private static PlanningDecision Decision(
        PlanningReadiness readiness,
        IReadOnlyList<AllowedPlanningAction> actions,
        IReadOnlyList<PlanningDecisionReason> reasons,
        IReadOnlyList<AllowedAssumption>? assumptions = null) =>
        new(readiness, actions.ToHashSet(), reasons, assumptions ?? []);
}
