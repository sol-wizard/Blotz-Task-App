using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Planning;

public sealed record VerifiedPlanningContext(
    IReadOnlyList<VerifiedPlanningItem> Items,
    IReadOnlyList<VerifiedConstraint> Constraints,
    UserTurnDisposition Disposition,
    EvidenceSummary Evidence);

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
    UserDelegatedPlanning = 2,
    ClarificationCanHelp = 3,
    UserRejectedAction = 4,
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

        var activeIntent = context.Snapshot.ActivePlanningIntent is
            { Status: PlanningIntentStatus.Collecting or PlanningIntentStatus.ReadyForProposal } reusable
            ? reusable
            : null;
        var clarificationAttempts = activeIntent?.AskedTopics?.Count ?? 0;
        var canAskClarification = clarificationAttempts < policy.MaxClarificationAttempts
                                  && context.Snapshot.OpenQuestion is null;
        var items = activeIntent?.Items
            .Select(item => item.Kind)
            .Concat(verified.Items.Select(item => item.Kind))
            .ToList() ?? verified.Items.Select(item => item.Kind).ToList();

        if (items.Count == 0)
        {
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

        if (items.Contains(PlanningItemKind.Action))
        {
            return Decision(
                PlanningReadiness.ReadyForProposal,
                [AllowedPlanningAction.ContinueConversation, AllowedPlanningAction.GenerateProposal],
                [PlanningDecisionReason.VerifiedActionAvailable],
                [AllowedAssumption.DefaultDuration, AllowedAssumption.NextAvailableSlot]);
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

    private static PlanningDecision Decision(
        PlanningReadiness readiness,
        IReadOnlyList<AllowedPlanningAction> actions,
        IReadOnlyList<PlanningDecisionReason> reasons,
        IReadOnlyList<AllowedAssumption>? assumptions = null) =>
        new(readiness, actions.ToHashSet(), reasons, assumptions ?? []);
}
