using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Support;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Policy;

public sealed record PolicyContext(
    ConversationSnapshot Snapshot,
    StrategyEnvelope Envelope,
    ModelTurnCandidate Candidate,
    AiCoachModeDefinition Mode,
    VerifiedPlanningContext VerifiedPlanning,
    PlanningAuthority Planning,
    SupportDecision? Support = null,
    ProposalSetMutationVerdict? ProposalMutation = null,
    CandidateValidationFailure? Failure = null);

public interface IConversationPostPolicy
{
    StrategyDecision Decide(PolicyContext context);
}

/// <summary>
/// The only owner of the final conversation strategy. It consumes verified facts and the
/// planning authority; it never reinterprets evidence or generates payload data.
/// </summary>
public sealed class ConversationPostPolicy : IConversationPostPolicy
{
    public StrategyDecision Decide(PolicyContext context)
    {
        var candidate = context.Candidate;
        var strategy = candidate.SuggestedAction;
        var envelope = context.Envelope;

        if (context.VerifiedPlanning.SupportRequest?.Kind == SupportRequestKind.WantsPause)
        {
            return context.Failure is null && strategy == ConversationStrategy.ContinueListening
                   && candidate.ResponseCandidate is ListeningResponse
                   && (context.Support is null || candidate.SuggestedSupportMove is
                       SupportMove.Acknowledge or SupportMove.RespectPause)
                ? Accept(strategy, acceptProposal: false)
                : Downgrade(ConversationStrategy.ContinueListening, StrategyReasonCode.PauseRequested);
        }

        // Current withdrawal takes priority over malformed strategy/payload repair.
        if (context.VerifiedPlanning.Disposition == UserTurnDisposition.RejectedAction)
        {
            return context.Failure is null && strategy == ConversationStrategy.ContinueListening
                   && candidate.ResponseCandidate is ListeningResponse
                ? Accept(strategy, acceptProposal: false)
                : Downgrade(ConversationStrategy.ContinueListening, StrategyReasonCode.UserRejectedAction);
        }

        if (candidate.ProposalSetMutationCandidate is not null
            && envelope.AllowedStrategies.Contains(ConversationStrategy.UpdateProposalSet)
            && context.ProposalMutation is { Readiness: ProposalSetMutationReadiness.NeedsClarification })
        {
            if (strategy == ConversationStrategy.AskClarifyingQuestion
                && candidate.ResponseCandidate is ClarifyingQuestionResponse)
            {
                // Continue through the common envelope/response checks. No mutation is accepted.
            }
            else
            {
                return new StrategyDecision(
                    ConversationStrategy.AskClarifyingQuestion,
                    StrategyDecisionType.RequiresRegeneration,
                    StrategyReasonCode.ProposalMutationNeedsClarification,
                    AcceptResponseCandidate: false,
                    AcceptProposalSetCandidate: false,
                    new RegenerationDirective(
                        ConversationStrategy.AskClarifyingQuestion,
                        ["response", "proposalSetMutation"],
                        context.Planning.AllowedAssumptions.ToHashSet(),
                        context.ProposalMutation.Detail),
                    new PolicyFallbackPlan(
                        PolicyFallbackAction.SafeResponse,
                        ConversationStrategy.AskClarifyingQuestion));
            }
        }

        if (strategy == ConversationStrategy.ShowProposalSet
            && context.VerifiedPlanning.Evidence.HasInvalidClaims)
        {
            return Downgrade(ConversationStrategy.ContinueListening,
                StrategyReasonCode.EvidenceInvalid);
        }

        if (strategy == ConversationStrategy.ShowProposalSet
            && !context.Planning.CanGenerateProposal)
        {
            return Downgrade(ConversationStrategy.ContinueListening,
                StrategyReasonCode.ExplicitActionIntentRequired);
        }

        if (context.Support is not null && !SupportMoveAllowed(candidate, strategy, context.Support))
        {
            var reason = candidate.SuggestedSupportMove == SupportMove.OfferAdvice
                ? StrategyReasonCode.AdviceNotRequested
                : StrategyReasonCode.SupportMoveNotAllowed;
            return RegenerateResponse(
                ConversationStrategy.ContinueListening,
                reason,
                context.Planning.AllowedAssumptions.ToHashSet());
        }

        if (strategy == ConversationStrategy.ShowProposalSet
            && context.Snapshot.CurrentProposalSet is { IsOpen: true })
        {
            return Downgrade(
                ConversationStrategy.DiscussExistingProposal,
                StrategyReasonCode.PendingProposalSetAlreadyExists);
        }

        if (!envelope.AllowedStrategies.Contains(strategy))
            return Downgrade(ConversationStrategy.ContinueListening, StrategyReasonCode.StrategyNotInEnvelope);

        if (!ResponseMatches(strategy, candidate.ResponseCandidate))
        {
            return new StrategyDecision(
                strategy,
                StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ResponseTypeMismatch,
                AcceptResponseCandidate: false,
                AcceptProposalSetCandidate: false,
                new RegenerationDirective(strategy, ["response"], context.Planning.AllowedAssumptions.ToHashSet()),
                FallbackFor(context, strategy));
        }

        if (strategy.AsksQuestion() && string.IsNullOrWhiteSpace(QuestionOf(candidate.ResponseCandidate)))
        {
            return new StrategyDecision(
                strategy,
                StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ResponseInvalid,
                AcceptResponseCandidate: false,
                AcceptProposalSetCandidate: false,
                new RegenerationDirective(strategy, ["response.question"], context.Planning.AllowedAssumptions.ToHashSet()),
                FallbackFor(context, strategy));
        }

        if (IsPlanningQuestion(strategy)
            && context.ProposalMutation?.Readiness != ProposalSetMutationReadiness.NeedsClarification
            && !context.Planning.CanAskClarifyingQuestion)
        {
            var repairStrategy = context.Support?.Allows(SupportMove.GentleQuestion) == true
                                 && envelope.AllowedStrategies.Contains(ConversationStrategy.AskGentleQuestion)
                ? ConversationStrategy.AskGentleQuestion
                : ConversationStrategy.ContinueListening;
            var reason = context.Snapshot.OpenQuestion is not null
                ? StrategyReasonCode.ClarificationSlotAlreadyAsked
                : StrategyReasonCode.PlanningQuestionNotAuthorized;
            return RegenerateResponse(
                repairStrategy,
                reason,
                context.Planning.AllowedAssumptions.ToHashSet());
        }

        if (context.Failure is { } failure)
        {
            var repair = failure.Kind switch
            {
                CandidateFailureKind.Proposal => ProposalFailure(context, StrategyReasonCode.ProposalSetInvalid),
                CandidateFailureKind.ProposalMutation => MutationFailure(context, failure.Detail),
                _ => new StrategyDecision(strategy, StrategyDecisionType.RequiresRegeneration,
                    StrategyReasonCode.ResponseInvalid, false, false,
                    new RegenerationDirective(strategy, ["response"],
                        context.Planning.AllowedAssumptions.ToHashSet()),
                    FallbackFor(context, strategy)),
            };
            return repair with
            {
                Regeneration = repair.Regeneration is { } directive
                    ? directive with { ValidationDetail = failure.Detail } : null,
            };
        }

        if (strategy == ConversationStrategy.ShowProposalSet)
            return DecideProposal(context);

        if (strategy == ConversationStrategy.UpdateProposalSet)
            return DecideProposalMutation(context);

        return Accept(strategy, acceptProposal: false);
    }

    private static StrategyDecision DecideProposalMutation(PolicyContext context)
    {
        if (context.Candidate.ProposalSetMutationCandidate is null)
            return MutationFailure(context, "proposalSetMutation is required for update_proposal_set.",
                StrategyReasonCode.ProposalMutationMissing);

        if (context.ProposalMutation is not { IsReady: true })
            return MutationFailure(
                context,
                context.ProposalMutation?.Detail ?? "The proposal mutation was not validated.");

        return Accept(ConversationStrategy.UpdateProposalSet, acceptProposal: false) with
        {
            AcceptProposalSetMutationCandidate = true,
        };
    }

    private static StrategyDecision MutationFailure(
        PolicyContext context,
        string detail,
        StrategyReasonCode reason = StrategyReasonCode.ProposalMutationInvalid) =>
        new(
            ConversationStrategy.UpdateProposalSet,
            StrategyDecisionType.RequiresRegeneration,
            reason,
            AcceptResponseCandidate: false,
            AcceptProposalSetCandidate: false,
            new RegenerationDirective(
                ConversationStrategy.UpdateProposalSet,
                ["response", "proposalSetMutation"],
                context.Planning.AllowedAssumptions.ToHashSet(),
                detail),
            new PolicyFallbackPlan(
                PolicyFallbackAction.SafeResponse,
                ConversationStrategy.DiscussExistingProposal));

    private static StrategyDecision DecideProposal(PolicyContext context)
    {
        if (!context.Planning.CanGenerateProposal)
        {
            var reason = context.Planning.IsBlocked
                ? StrategyReasonCode.UserRejectedAction
                : context.VerifiedPlanning.Evidence.HasInvalidClaims
                    ? StrategyReasonCode.EvidenceInvalid
                    : StrategyReasonCode.ExplicitActionIntentRequired;
            return Downgrade(ConversationStrategy.ContinueListening, reason);
        }

        if (context.Candidate.ProposalSetCandidate is null
            || context.Candidate.ProposalSetCandidate.Proposals.Count == 0)
        {
            return ProposalFailure(context, StrategyReasonCode.ProposalSetMissing);
        }

        if (context.Candidate.ProposalSetCandidate.Proposals.Count
            > context.Envelope.ProposalConstraints.MaxProposals)
        {
            return ProposalFailure(context, StrategyReasonCode.ProposalSetInvalid);
        }

        return Accept(ConversationStrategy.ShowProposalSet, acceptProposal: true) with
        {
            Fallback = new PolicyFallbackPlan(
                PolicyFallbackAction.DeterministicProposal,
                ConversationStrategy.ContinueListening),
        };
    }

    private static StrategyDecision RegenerateProposal(
        PolicyContext context,
        StrategyReasonCode reason) =>
        new(
            ConversationStrategy.ShowProposalSet,
            StrategyDecisionType.RequiresRegeneration,
            reason,
            AcceptResponseCandidate: false,
            AcceptProposalSetCandidate: false,
            new RegenerationDirective(
                ConversationStrategy.ShowProposalSet,
                ["response", "proposalSet"],
                context.Planning.AllowedAssumptions.ToHashSet()),
            new PolicyFallbackPlan(
                PolicyFallbackAction.DeterministicProposal,
                ConversationStrategy.ContinueListening));

    private static StrategyDecision RegenerateResponse(
        ConversationStrategy strategy,
        StrategyReasonCode reason,
        IReadOnlySet<AllowedAssumption> allowedAssumptions) =>
        new(
            strategy,
            StrategyDecisionType.RequiresRegeneration,
            reason,
            AcceptResponseCandidate: false,
            AcceptProposalSetCandidate: false,
            new RegenerationDirective(strategy, ["response"], allowedAssumptions),
            new PolicyFallbackPlan(PolicyFallbackAction.SafeResponse, strategy));

    private static StrategyDecision ProposalFailure(PolicyContext context, StrategyReasonCode reason)
    {
        var canGenerate = context.Planning.CanGenerateProposal;
        return canGenerate
            ? RegenerateProposal(context, reason)
            : Downgrade(ConversationStrategy.ContinueListening, reason);
    }

    private static StrategyDecision Accept(ConversationStrategy strategy, bool acceptProposal) =>
        new(strategy, StrategyDecisionType.Accepted, StrategyReasonCode.None,
            AcceptResponseCandidate: true, AcceptProposalSetCandidate: acceptProposal,
            Fallback: new PolicyFallbackPlan(PolicyFallbackAction.SafeResponse, strategy));

    private static StrategyDecision Downgrade(ConversationStrategy target, StrategyReasonCode reason) =>
        new(target, StrategyDecisionType.Downgraded, reason,
            AcceptResponseCandidate: false, AcceptProposalSetCandidate: false,
            Fallback: new PolicyFallbackPlan(PolicyFallbackAction.SafeResponse, target));

    private static PolicyFallbackPlan FallbackFor(
        PolicyContext context,
        ConversationStrategy strategy) =>
        strategy == ConversationStrategy.ShowProposalSet
            ? new PolicyFallbackPlan(
                PolicyFallbackAction.DeterministicProposal,
                ConversationStrategy.ContinueListening)
            : new PolicyFallbackPlan(PolicyFallbackAction.SafeResponse, ConversationStrategy.ContinueListening);

    private static bool ResponseMatches(ConversationStrategy strategy, AssistantResponseCandidate response) =>
        strategy switch
        {
            ConversationStrategy.ContinueListening => response is ListeningResponse,
            ConversationStrategy.DiscussExistingProposal => response is ListeningResponse,
            ConversationStrategy.AskGentleQuestion => response is GentleQuestionResponse,
            ConversationStrategy.AskClarifyingQuestion => response is ClarifyingQuestionResponse,
            ConversationStrategy.AskUserToChooseGoal => response is GoalChoiceResponse,
            ConversationStrategy.ShowProposalSet => response is ProposalIntroductionResponse,
            ConversationStrategy.UpdateProposalSet => response is ProposalUpdateResponse,
            _ => false,
        };

    private static string? QuestionOf(AssistantResponseCandidate response) => response switch
    {
        GentleQuestionResponse value => value.Question,
        ClarifyingQuestionResponse value => value.Question,
        GoalChoiceResponse value => value.Question,
        _ => null,
    };

    private static bool SupportMoveAllowed(
        ModelTurnCandidate candidate,
        ConversationStrategy strategy,
        SupportDecision support)
    {
        if (strategy is ConversationStrategy.ShowProposalSet or ConversationStrategy.UpdateProposalSet)
        {
            return true;
        }

        if (strategy.AsksQuestion() && !support.Allows(SupportMove.GentleQuestion))
            return false;

        // An optional main-move label is not a permission token for ordinary conversation.
        // When explicit restrictions exist, require a compatible label and question strategy.
        return candidate.SuggestedSupportMove is { } move
            ? support.Allows(move)
            : support.Allows(SupportMove.OfferAdvice) && support.Allows(SupportMove.GentleQuestion);
    }

    private static bool IsPlanningQuestion(ConversationStrategy strategy) =>
        strategy is ConversationStrategy.AskClarifyingQuestion
            or ConversationStrategy.AskUserToChooseGoal;

}
