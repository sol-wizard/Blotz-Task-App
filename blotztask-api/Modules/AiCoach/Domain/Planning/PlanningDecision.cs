using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Planning;

/// <summary>Structurally validated model interpretation, not proven or user-confirmed facts.</summary>
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

public enum PlanningAuthorityReason
{
    NoVerifiedPlanningMaterial = 0,
    VerifiedActionAvailable = 1,
    ConservativeGoalProposalAllowed = 2,
    UserDelegatedPlanning = 3,
    SafeDefaultsAllowed = 4,
    ClarificationCanHelp = 5,
    UserRejectedAction = 6,
    ExplicitActionRequestRequired = 7,
    EvidenceInvalid = 8,
    CurrentRequestIsConversational = 9,
    ExplicitPlanningRequestAuthorized = 10,
}

public enum AllowedAssumption
{
    CoachDecomposition = 0,
    DefaultDuration = 1,
    NextAvailableSlot = 2,
}

/// <summary>
/// The deterministic planning authority for one verified user turn. It deliberately does not
/// prescribe a conversation flow: the model chooses whether and how to ask, suggest or plan
/// from the strategies exposed by Pre-Policy. This module only grants or withholds the stateful
/// planning actions that need server authority.
/// </summary>
public sealed record PlanningAuthority(
    bool IsBlocked,
    bool CanGenerateProposal,
    bool CanAskClarifyingQuestion,
    IReadOnlyList<PlanningAuthorityReason> Reasons,
    IReadOnlyList<AllowedAssumption> AllowedAssumptions)
{
    public bool CanAdvancePlanning => CanGenerateProposal || CanAskClarifyingQuestion;
}

public sealed record PlanningAuthorityContext(
    ConversationSnapshot Snapshot,
    VerifiedPlanningContext Verified,
    PlanningPolicyDefinition Policy);

public interface IPlanningAuthorityCalculator
{
    PlanningAuthority Calculate(PlanningAuthorityContext context);
}

public sealed class PlanningAuthorityCalculator : IPlanningAuthorityCalculator
{
    public PlanningAuthority Calculate(PlanningAuthorityContext context)
    {
        var verified = context.Verified;
        var policy = context.Policy;

        if (verified.Disposition == UserTurnDisposition.RejectedAction)
        {
            return Authority(isBlocked: true, canGenerateProposal: false, canAskClarifyingQuestion: false,
                [PlanningAuthorityReason.UserRejectedAction]);
        }

        // Evidence Guard still owns structural evidence failures such as missing quotes. Source
        // matching itself is temporarily disabled, but other invalid evidence remains fail-closed.
        if (verified.Evidence.HasInvalidClaims)
        {
            return Authority(isBlocked: false, canGenerateProposal: false, canAskClarifyingQuestion: false,
                [PlanningAuthorityReason.EvidenceInvalid]);
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
            return Authority(isBlocked: false, canGenerateProposal: false, canAskClarifyingQuestion: false,
                [PlanningAuthorityReason.CurrentRequestIsConversational]);
        }

        var activeIntent = PlanningStateRules.ReusableIntent(context.Snapshot, verified);
        var canAskClarification = context.Snapshot.OpenQuestion is null;
        var items = activeIntent?.Items
            .Select(item => item.Kind)
            .Concat(verified.Items.Select(item => item.Kind))
            .ToList() ?? verified.Items.Select(item => item.Kind).ToList();

        if (items.Count == 0)
        {
            if (policy.ProposalTrigger == ProposalTriggerPolicy.CurrentTurnDirectInstruction
                && verified.ActionRequest?.Kind != ActionRequestKind.DirectInstruction)
            {
                return Authority(isBlocked: false, canGenerateProposal: false, canAskClarifyingQuestion: false,
                    [PlanningAuthorityReason.ExplicitActionRequestRequired]);
            }

            return Authority(isBlocked: false, canGenerateProposal: false,
                canAskClarifyingQuestion: canAskClarification,
                canAskClarification
                    ? [PlanningAuthorityReason.NoVerifiedPlanningMaterial, PlanningAuthorityReason.ClarificationCanHelp]
                    : [PlanningAuthorityReason.NoVerifiedPlanningMaterial]);
        }

        if (items.Contains(PlanningItemKind.Action)
            && ProposalTriggerSatisfied(policy.ProposalTrigger, verified))
        {
            return Authority(isBlocked: false, canGenerateProposal: true, canAskClarifyingQuestion: canAskClarification,
                [PlanningAuthorityReason.VerifiedActionAvailable],
                [AllowedAssumption.DefaultDuration, AllowedAssumption.NextAvailableSlot]);
        }

        if (policy.AllowCoachDecomposition
            && (verified.Disposition == UserTurnDisposition.DelegatedToCoach
                || verified.ActionRequest?.Kind == ActionRequestKind.ExplicitPlanningRequest))
        {
            var reason = verified.Disposition == UserTurnDisposition.DelegatedToCoach
                ? PlanningAuthorityReason.UserDelegatedPlanning
                : PlanningAuthorityReason.ExplicitPlanningRequestAuthorized;
            return Authority(isBlocked: false, canGenerateProposal: true, canAskClarifyingQuestion: canAskClarification,
                [reason],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (verified.Disposition == UserTurnDisposition.CannotProvide
            && policy.AllowSafeDefaultsWhenClarificationUnavailable)
        {
            return Authority(isBlocked: false, canGenerateProposal: true, canAskClarifyingQuestion: canAskClarification,
                [PlanningAuthorityReason.SafeDefaultsAllowed],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (policy.AllowConservativeGoalProposal)
        {
            return Authority(isBlocked: false, canGenerateProposal: true, canAskClarifyingQuestion: canAskClarification,
                [PlanningAuthorityReason.ConservativeGoalProposalAllowed],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        return Authority(isBlocked: false, canGenerateProposal: false,
            canAskClarifyingQuestion: canAskClarification,
            [PlanningAuthorityReason.ClarificationCanHelp]);
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

    private static PlanningAuthority Authority(
        bool isBlocked,
        bool canGenerateProposal,
        bool canAskClarifyingQuestion,
        IReadOnlyList<PlanningAuthorityReason> reasons,
        IReadOnlyList<AllowedAssumption>? assumptions = null) =>
        new(isBlocked, canGenerateProposal, canAskClarifyingQuestion, reasons, assumptions ?? []);
}
