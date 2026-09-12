using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Support;

namespace BlotzTask.Modules.AiCoach.Domain.Policy;

public sealed record PolicyContext(
    ConversationSnapshot Snapshot,
    StrategyEnvelope Envelope,
    ModelTurnCandidate Candidate,
    AiCoachModeDefinition Mode,
    VerifiedPlanningContext VerifiedPlanning,
    PlanningDecision Planning,
    SupportDecision? Support = null);

public interface IConversationPostPolicy
{
    StrategyDecision Decide(PolicyContext context);
}

/// <summary>
/// The only owner of the final conversation strategy. It consumes verified facts and the
/// readiness calculator's decision; it never reinterprets evidence or generates payload data.
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
            return strategy == ConversationStrategy.ContinueListening
                   && candidate.ResponseCandidate is ListeningResponse
                   && (context.Support is null || candidate.SuggestedSupportMove is
                       SupportMove.Acknowledge or SupportMove.RespectPause)
                ? Accept(strategy, acceptProposal: false)
                : Downgrade(ConversationStrategy.ContinueListening, StrategyReasonCode.PauseRequested);
        }

        // Current withdrawal takes priority over malformed strategy/payload repair.
        if (context.VerifiedPlanning.Disposition == UserTurnDisposition.RejectedAction)
        {
            return strategy == ConversationStrategy.ContinueListening
                   && candidate.ResponseCandidate is ListeningResponse
                ? Accept(strategy, acceptProposal: false)
                : Downgrade(ConversationStrategy.ContinueListening, StrategyReasonCode.UserRejectedAction);
        }

        if (strategy == ConversationStrategy.ShowProposalSet
            && (context.VerifiedPlanning.Evidence.HasInvalidClaims
                || !context.Planning.Allows(AllowedPlanningAction.GenerateProposal)))
        {
            return Downgrade(ConversationStrategy.ContinueListening,
                context.VerifiedPlanning.Evidence.HasInvalidClaims
                    ? StrategyReasonCode.EvidenceInvalid : StrategyReasonCode.ExplicitActionIntentRequired);
        }

        if (context.Support is not null && !SupportMoveAllowed(candidate, strategy, context.Support))
        {
            var reason = candidate.SuggestedSupportMove == SupportMove.OfferAdvice
                ? StrategyReasonCode.AdviceNotRequested
                : strategy == ConversationStrategy.AskGentleQuestion
                    ? StrategyReasonCode.QuestionCadenceExhausted
                    : StrategyReasonCode.SupportMoveNotAllowed;
            return Downgrade(ConversationStrategy.ContinueListening, reason);
        }

        if (!envelope.AllowedStrategies.Contains(strategy))
        {
            if (strategy.AsksQuestion()
                && context.Planning.Allows(AllowedPlanningAction.GenerateProposal)
                && envelope.ProposalConstraints.ProposalAllowed)
            {
                return RegenerateProposal(context, StrategyReasonCode.ActionableIntentRequiresProposal);
            }

            return strategy == ConversationStrategy.ShowProposalSet
                   && context.Snapshot.CurrentProposalSet is { IsOpen: true }
                ? Downgrade(ConversationStrategy.DiscussExistingProposal,
                    StrategyReasonCode.PendingProposalSetAlreadyExists)
                : Downgrade(SafeFallbackStrategy(envelope), StrategyReasonCode.StrategyNotInEnvelope);
        }

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
            && !context.Planning.Allows(AllowedPlanningAction.AskClarification))
        {
            return context.Planning.Allows(AllowedPlanningAction.GenerateProposal)
                ? RegenerateProposal(context, StrategyReasonCode.ActionableIntentRequiresProposal)
                : Downgrade(ConversationStrategy.ContinueListening, StrategyReasonCode.ClarificationSlotAlreadyAsked);
        }

        if (strategy == ConversationStrategy.ShowProposalSet)
            return DecideProposal(context);

        return Accept(strategy, acceptProposal: false);
    }

    private static StrategyDecision DecideProposal(PolicyContext context)
    {
        if (!context.Envelope.ProposalConstraints.ProposalAllowed)
        {
            return Downgrade(
                SafeFallbackStrategy(context.Envelope),
                StrategyReasonCode.PendingProposalSetAlreadyExists);
        }

        if (!context.Planning.Allows(AllowedPlanningAction.GenerateProposal))
        {
            var reason = context.Planning.Readiness == PlanningReadiness.Blocked
                ? StrategyReasonCode.UserRejectedAction
                : context.VerifiedPlanning.Evidence.HasInvalidClaims
                    ? StrategyReasonCode.EvidenceInvalid
                    : StrategyReasonCode.ExplicitActionIntentRequired;
            return Downgrade(QuestionFallback(context), reason);
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
                QuestionFallback(context)),
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
                QuestionFallback(context)));

    private static StrategyDecision ProposalFailure(PolicyContext context, StrategyReasonCode reason)
    {
        var canGenerate = context.Planning.Allows(AllowedPlanningAction.GenerateProposal);
        return canGenerate
            ? RegenerateProposal(context, reason)
            : Downgrade(QuestionFallback(context), reason);
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
                QuestionFallback(context))
            : new PolicyFallbackPlan(PolicyFallbackAction.SafeResponse, ConversationStrategy.ContinueListening);

    private static ConversationStrategy QuestionFallback(PolicyContext context) =>
        context.Planning.Allows(AllowedPlanningAction.AskClarification)
        && context.Envelope.AllowedStrategies.Contains(ConversationStrategy.AskClarifyingQuestion)
            ? ConversationStrategy.AskClarifyingQuestion
            : ConversationStrategy.ContinueListening;

    private static ConversationStrategy SafeFallbackStrategy(StrategyEnvelope envelope) =>
        ConversationStrategy.ContinueListening;

    private static bool ResponseMatches(ConversationStrategy strategy, AssistantResponseCandidate response) =>
        strategy switch
        {
            ConversationStrategy.ContinueListening => response is ListeningResponse,
            ConversationStrategy.DiscussExistingProposal => response is ListeningResponse,
            ConversationStrategy.AskGentleQuestion => response is GentleQuestionResponse,
            ConversationStrategy.AskClarifyingQuestion => response is ClarifyingQuestionResponse,
            ConversationStrategy.AskUserToChooseGoal => response is GoalChoiceResponse,
            ConversationStrategy.ShowProposalSet => response is ProposalIntroductionResponse,
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
        if (strategy is ConversationStrategy.ShowProposalSet
            or ConversationStrategy.DiscussExistingProposal)
        {
            return true;
        }

        var move = strategy.AsksQuestion()
            ? SupportMove.GentleQuestion
            : candidate.SuggestedSupportMove;
        return move is not null && support.Allows(move.Value);
    }

    private static bool IsPlanningQuestion(ConversationStrategy strategy) =>
        strategy is ConversationStrategy.AskClarifyingQuestion
            or ConversationStrategy.AskUserToChooseGoal;
}
