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
    VerifiedSupportRequest? SupportRequest = null,
    IReadOnlyList<VerifiedPlanningReference>? References = null);

public sealed record VerifiedActionRequest(
    ActionRequestKind Kind,
    string? EvidenceQuote,
    Guid? ReferencedItemId = null);

public sealed record VerifiedPlanningReference(
    Guid ItemId,
    PlanningReferenceKind Kind,
    string EvidenceQuote);

public sealed record PlanningReferenceTarget(
    Guid IntentId,
    Guid ItemId);

public sealed record EvidenceVerificationContext(
    string CurrentUserMessage,
    IReadOnlyDictionary<string, PlanningReferenceTarget> PlanningReferences);

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
    InvalidPlanningReference = 4,
    ConflictingPlanningReference = 5,
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
    EstablishedContextAvailable = 11,
    ClarificationLimitReached = 12,
}

public enum AllowedAssumption
{
    CoachDecomposition = 0,
    DefaultDuration = 1,
    NextAvailableSlot = 2,
}

public enum ProposalDisposition
{
    Forbidden = 0,
    Optional = 1,
    Required = 2,
}

public enum ClarificationDisposition
{
    NotAllowed = 0,
    Allowed = 1,
    Exhausted = 2,
}

public enum PlanningContextReadiness
{
    Insufficient = 0,
    Draftable = 1,
    Actionable = 2,
}

public sealed record PlanningContextAssessment(
    bool HasTarget,
    bool HasScope,
    bool HasGrounding,
    PlanningContextReadiness Readiness);

/// <summary>
/// Maps verified planning material into stable semantic roles. Product policies consume the
/// readiness result instead of depending on individual item/constraint combinations.
/// </summary>
public static class PlanningContextEvaluator
{
    public static PlanningContextAssessment Evaluate(
        IReadOnlyCollection<PlanningItemKind> items,
        int constraintCount)
    {
        var hasTarget = items.Contains(PlanningItemKind.Goal);
        var hasScope = items.Contains(PlanningItemKind.Domain);
        var hasGrounding = constraintCount > 0;
        var readiness = items.Contains(PlanningItemKind.Action)
            ? PlanningContextReadiness.Actionable
            : hasTarget && hasScope && hasGrounding
                ? PlanningContextReadiness.Draftable
                : PlanningContextReadiness.Insufficient;

        return new PlanningContextAssessment(hasTarget, hasScope, hasGrounding, readiness);
    }
}

/// <summary>
/// The deterministic planning authority for one verified user turn. It deliberately does not
/// prescribe a conversation flow: the model chooses whether and how to ask, suggest or plan
/// from the strategies exposed by Pre-Policy. This module only grants or withholds the stateful
/// planning actions that need server authority.
/// </summary>
public sealed record PlanningAuthority(
    bool IsBlocked,
    ProposalDisposition Proposal,
    ClarificationDisposition Clarification,
    PlanningContextReadiness ContextReadiness,
    IReadOnlyList<PlanningAuthorityReason> Reasons,
    IReadOnlyList<AllowedAssumption> AllowedAssumptions)
{
    public bool CanGenerateProposal => Proposal is not ProposalDisposition.Forbidden;
    public bool CanAskClarifyingQuestion => Clarification == ClarificationDisposition.Allowed;
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
            return Authority(isBlocked: true, ProposalDisposition.Forbidden,
                ClarificationDisposition.NotAllowed, PlanningContextReadiness.Insufficient,
                [PlanningAuthorityReason.UserRejectedAction]);
        }

        // Evidence Guard still owns structural evidence failures such as missing quotes. Source
        // matching itself is temporarily disabled, but other invalid evidence remains fail-closed.
        if (verified.Evidence.HasInvalidClaims)
        {
            return Authority(isBlocked: false, ProposalDisposition.Forbidden,
                ClarificationDisposition.NotAllowed, PlanningContextReadiness.Insufficient,
                [PlanningAuthorityReason.EvidenceInvalid]);
        }

        var activeIntent = PlanningStateRules.ReusableIntent(context.Snapshot, verified);
        var clarificationAttempts = context.Snapshot.ActivePlanningIntent?.ClarificationAttempts ?? 0;
        var clarification = clarificationAttempts >= policy.MaxClarificationAttempts
            ? ClarificationDisposition.Exhausted
            : context.Snapshot.OpenQuestion is null
                ? ClarificationDisposition.Allowed
                : ClarificationDisposition.NotAllowed;
        var items = activeIntent is null
            ? verified.Items.Select(item => item.Kind).ToList()
            : PlanningStateRules.EffectiveItems(activeIntent, verified.References)
                .Select(item => item.Kind)
                .Concat(verified.Items.Select(item => item.Kind))
                .ToList();
        var constraints = (activeIntent?.Constraints.Count ?? 0) + verified.Constraints.Count;
        var contextAssessment = PlanningContextEvaluator.Evaluate(items, constraints);
        var contextDraftIsAllowed = policy.DraftContext == DraftContextPolicy.TargetScopeAndGrounding
                                    && contextAssessment.HasTarget
                                    && contextAssessment.HasScope
                                    && contextAssessment.HasGrounding;
        var proposalIsRequiredByExhaustion = policy.ClarificationExhaustion ==
                                             ClarificationExhaustionBehavior.RequireTentativeProposal
                                             && clarification == ClarificationDisposition.Exhausted
                                             && items.Count > 0;
        var currentTurnCanAdvancePlanning = contextDraftIsAllowed || proposalIsRequiredByExhaustion;
        var actionRequestIsConversational = verified.ActionRequest?.Kind is
            ActionRequestKind.AdviceRequest or ActionRequestKind.ActionMention;
        var hasExplicitPlanningRequest = verified.ActionRequest?.Kind is
            ActionRequestKind.DirectInstruction or ActionRequestKind.ExplicitPlanningRequest;
        var supportRequestIsConversational = verified.SupportRequest?.Kind is
            SupportRequestKind.WantsListening or SupportRequestKind.WantsPerspective
            or SupportRequestKind.WantsAdvice or SupportRequestKind.WantsPause
            or SupportRequestKind.RejectsAdvice;
        var unrequestedNarration = verified.ActionRequest?.Kind == ActionRequestKind.None
                                   && verified.Disposition == UserTurnDisposition.NotApplicable
                                   && !currentTurnCanAdvancePlanning;

        // A request for advice, a narration or a pause is not an instruction to schedule,
        // even if it contains an activity or an old intent is ready.
        if (verified.SupportRequest?.Kind == SupportRequestKind.WantsPause
            || unrequestedNarration
            || actionRequestIsConversational
            || supportRequestIsConversational && !hasExplicitPlanningRequest)
        {
            return Authority(isBlocked: false, ProposalDisposition.Forbidden,
                ClarificationDisposition.NotAllowed, contextAssessment.Readiness,
                [PlanningAuthorityReason.CurrentRequestIsConversational]);
        }

        if (items.Count == 0)
        {
            if (policy.ProposalTrigger == ProposalTriggerPolicy.CurrentTurnDirectInstruction
                && verified.ActionRequest?.Kind != ActionRequestKind.DirectInstruction)
            {
                return Authority(isBlocked: false, ProposalDisposition.Forbidden,
                    ClarificationDisposition.NotAllowed, contextAssessment.Readiness,
                    [PlanningAuthorityReason.ExplicitActionRequestRequired]);
            }

            return Authority(isBlocked: false, ProposalDisposition.Forbidden,
                clarification, contextAssessment.Readiness,
                clarification == ClarificationDisposition.Allowed
                    ? [PlanningAuthorityReason.NoVerifiedPlanningMaterial, PlanningAuthorityReason.ClarificationCanHelp]
                    : [PlanningAuthorityReason.NoVerifiedPlanningMaterial]);
        }

        // A required disposition dominates every optional proposal path. The reason remains
        // diagnostic; downstream policy consumes only the typed disposition.
        if (proposalIsRequiredByExhaustion)
        {
            return Authority(isBlocked: false, ProposalDisposition.Required, clarification,
                contextAssessment.Readiness,
                [PlanningAuthorityReason.ClarificationLimitReached],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (items.Contains(PlanningItemKind.Action)
            && ProposalTriggerSatisfied(policy.ProposalTrigger, verified))
        {
            return Authority(isBlocked: false, ProposalDisposition.Optional, clarification,
                contextAssessment.Readiness,
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
            return Authority(isBlocked: false, ProposalDisposition.Optional, clarification,
                contextAssessment.Readiness,
                [reason],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (verified.Disposition == UserTurnDisposition.CannotProvide
            && policy.AllowSafeDefaultsWhenClarificationUnavailable)
        {
            return Authority(isBlocked: false, ProposalDisposition.Optional, clarification,
                contextAssessment.Readiness,
                [PlanningAuthorityReason.SafeDefaultsAllowed],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (contextDraftIsAllowed)
        {
            return Authority(isBlocked: false, ProposalDisposition.Optional, clarification,
                contextAssessment.Readiness,
                [PlanningAuthorityReason.EstablishedContextAvailable],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        if (policy.AllowConservativeGoalProposal)
        {
            return Authority(isBlocked: false, ProposalDisposition.Optional, clarification,
                contextAssessment.Readiness,
                [PlanningAuthorityReason.ConservativeGoalProposalAllowed],
                [AllowedAssumption.CoachDecomposition, AllowedAssumption.DefaultDuration,
                    AllowedAssumption.NextAvailableSlot]);
        }

        return Authority(isBlocked: false, ProposalDisposition.Forbidden, clarification,
            contextAssessment.Readiness,
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
        ProposalDisposition proposalDisposition,
        ClarificationDisposition clarificationDisposition,
        PlanningContextReadiness contextReadiness,
        IReadOnlyList<PlanningAuthorityReason> reasons,
        IReadOnlyList<AllowedAssumption>? assumptions = null) =>
        new(isBlocked, proposalDisposition, clarificationDisposition, contextReadiness,
            reasons, assumptions ?? []);
}
