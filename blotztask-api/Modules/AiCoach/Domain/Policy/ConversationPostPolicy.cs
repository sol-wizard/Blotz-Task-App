using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>
/// Everything the Post-Policy is allowed to see (v3 tech design §13.7): assembled inputs only —
/// no store, no model, no clock. <see cref="ActionIntentEvidenceVerified"/> is the Evidence
/// Guard's verdict on the candidate's action-intent quote; the policy itself never re-reads the
/// user message.
/// </summary>
public sealed record PolicyContext(
    ConversationSnapshot Snapshot,
    StrategyEnvelope Envelope,
    ModelTurnCandidate Candidate,
    AiCoachModeDefinition Mode,
    bool ActionIntentEvidenceVerified,
    bool SpecificGoalEvidenceVerified = false);

/// <summary>
/// Post-Policy (v3 tech design §12/§13): decides the FINAL strategy for the turn. It may accept
/// the model's candidate, downgrade it to a lower risk level, or demand one regeneration —
/// it can never upgrade to a higher risk level and can never trigger a business side effect.
/// </summary>
public interface IConversationPostPolicy
{
    StrategyDecision Decide(PolicyContext context);
}

public sealed class ConversationPostPolicy : IConversationPostPolicy
{
    public StrategyDecision Decide(PolicyContext context)
    {
        var candidate = context.Candidate;
        var strategy = candidate.StrategyCandidate;
        var envelope = context.Envelope;

        // 1. Envelope check: a strategy outside the allowed space is never executed. The classic
        //    case is ShowProposalSet while a card is already pending -> discuss the existing one.
        if (!envelope.AllowedStrategies.Contains(strategy))
        {
            if (strategy.AsksQuestion() && context.Snapshot.OpenQuestion is not null)
            {
                return new StrategyDecision(
                    ConversationStrategy.ShowProposalSet,
                    StrategyDecisionType.RequiresRegeneration,
                    StrategyReasonCode.ClarificationSlotAlreadyAsked,
                    AcceptResponseCandidate: false,
                    AcceptProposalSetCandidate: false);
            }

            return strategy == ConversationStrategy.ShowProposalSet
                   && context.Snapshot.CurrentProposalSet is { IsOpen: true }
                ? Downgrade(ConversationStrategy.DiscussExistingProposal, StrategyReasonCode.PendingProposalSetAlreadyExists)
                : Downgrade(SafeFallbackStrategy(envelope), StrategyReasonCode.StrategyNotInEnvelope);
        }

        // 2. The typed response must match the strategy (v3 §14.2 mapping). A mismatch means the
        //    model broke the output contract — worth one regeneration before falling back.
        if (!ResponseMatches(strategy, candidate.ResponseCandidate))
            return new StrategyDecision(strategy, StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ResponseTypeMismatch, AcceptResponseCandidate: false, AcceptProposalSetCandidate: false);

        // 3. Question strategies must actually carry their single question.
        if (strategy.AsksQuestion() && string.IsNullOrWhiteSpace(QuestionOf(candidate.ResponseCandidate)))
            return new StrategyDecision(strategy, StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ResponseInvalid, AcceptResponseCandidate: false, AcceptProposalSetCandidate: false);

        // Evidence Guard has already verified concrete work in the current message. Asking the
        // user to choose among those tasks is no longer a valid interpretation; the model must
        // turn the verified intent into a proposal instead of reopening clarification.
        if (strategy.AsksQuestion()
            && context.ActionIntentEvidenceVerified
            && context.Candidate.Signals.PlanningItems is { Count: > 0 }
            && (candidate.Signals.CoachDecompositionAuthorized
                || context.Snapshot.ActivePlanningIntent?.CanSupportProposal == true))
        {
            return new StrategyDecision(
                ConversationStrategy.ShowProposalSet,
                StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ActionableIntentRequiresProposal,
                AcceptResponseCandidate: false,
                AcceptProposalSetCandidate: false);
        }

        // A low-risk goal/domain is enough to start a reversible discovery step. Do not make
        // the user choose a category before the coach has offered a useful default proposal.
        if (strategy.AsksQuestion() && context.SpecificGoalEvidenceVerified)
        {
            return new StrategyDecision(
                ConversationStrategy.ShowProposalSet,
                StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ActionableIntentRequiresProposal,
                AcceptResponseCandidate: false,
                AcceptProposalSetCandidate: false);
        }

        // Once the current message answers the single open clarification, an acknowledgement
        // is not a valid terminal outcome when planning material exists. Continue directly to
        // the conservative proposal path in this turn.
        if (strategy != ConversationStrategy.ShowProposalSet
            && context.Snapshot.OpenQuestion is not null
            && (candidate.Signals.PlanningItems is { Count: > 0 }
                || context.Snapshot.ActivePlanningIntent?.Items.Count > 0))
        {
            return new StrategyDecision(
                ConversationStrategy.ShowProposalSet,
                StrategyDecisionType.RequiresRegeneration,
                StrategyReasonCode.ClarificationResolvedRequiresProposal,
                AcceptResponseCandidate: false,
                AcceptProposalSetCandidate: false);
        }

        // 4. Proposal path: every gate of v3 §13.4 in order.
        if (strategy == ConversationStrategy.ShowProposalSet)
        {
            if (candidate.ProposalSetCandidate is null || candidate.ProposalSetCandidate.Proposals.Count == 0)
                return ProposalFailure(context, StrategyReasonCode.ProposalSetMissing);

            if (!envelope.ProposalConstraints.ProposalAllowed)
                return Downgrade(SafeFallbackStrategy(envelope), StrategyReasonCode.PendingProposalSetAlreadyExists);

            if (envelope.ProposalConstraints.RequiresExplicitActionIntent)
            {
                var hasCurrentExplicitIntent =
                    (candidate.Signals.UserExpressedActionIntent && context.ActionIntentEvidenceVerified)
                    || (candidate.Signals.ClarificationDisposition is ClarificationDisposition.Answered
                        or ClarificationDisposition.DelegatedToCoach
                        or ClarificationDisposition.CannotProvide
                        && candidate.Signals.PlanningItems is { Count: > 0 });
                var hasSpecificCoachSuggestion = context.SpecificGoalEvidenceVerified;
                var hasActiveVerifiedIntent = context.Snapshot.ActivePlanningIntent?.CanSupportProposal == true
                    || (context.Snapshot.OpenQuestion is not null
                        && context.Snapshot.ActivePlanningIntent?.Items.Count > 0);

                if (candidate.Signals.UserRejectedAction
                    || (candidate.Signals.UserExpressedActionIntent
                        && !context.ActionIntentEvidenceVerified
                        && !hasActiveVerifiedIntent
                        && !candidate.Signals.CoachDecompositionAuthorized
                        && !hasSpecificCoachSuggestion))
                    return ProposalFailure(context, StrategyReasonCode.EvidenceInvalid);

                if (candidate.Signals.UserRejectedAction
                    || (!hasCurrentExplicitIntent
                        && !candidate.Signals.CoachDecompositionAuthorized
                        && !hasSpecificCoachSuggestion
                        && !hasActiveVerifiedIntent))
                    return ProposalFailure(context, StrategyReasonCode.ExplicitActionIntentRequired);

                // The intent must be backed by a verified UserExplicit quote from the current
                // message or an active intent previously committed from such evidence.
                if (!hasCurrentExplicitIntent && !hasActiveVerifiedIntent && !hasSpecificCoachSuggestion)
                    return ProposalFailure(context, StrategyReasonCode.EvidenceInvalid);
            }

            if (candidate.ProposalSetCandidate.Proposals.Count > envelope.ProposalConstraints.MaxProposals)
                return ProposalFailure(context, StrategyReasonCode.ProposalSetInvalid);

            return new StrategyDecision(strategy, StrategyDecisionType.Accepted, StrategyReasonCode.None,
                AcceptResponseCandidate: true, AcceptProposalSetCandidate: true);
        }

        // 5. Non-proposal strategies: accept the candidate; any stray ProposalSetCandidate is
        //    silently discarded (it was never accepted, so nothing may be persisted from it).
        return new StrategyDecision(strategy, StrategyDecisionType.Accepted, StrategyReasonCode.None,
            AcceptResponseCandidate: true, AcceptProposalSetCandidate: false);
    }

    /// <summary>Downgrades never keep the candidate text — the fallback catalog speaks instead.</summary>
    private static StrategyDecision Downgrade(ConversationStrategy target, StrategyReasonCode reason) =>
        new(target, StrategyDecisionType.Downgraded, reason,
            AcceptResponseCandidate: false, AcceptProposalSetCandidate: false);

    private static StrategyDecision ProposalFailure(PolicyContext context, StrategyReasonCode reason)
    {
        var proposalOnly = context.Envelope.AllowedStrategies.Contains(ConversationStrategy.ShowProposalSet)
                           && !context.Envelope.AllowedStrategies.Contains(ConversationStrategy.AskClarifyingQuestion)
                           && !context.Envelope.AllowedStrategies.Contains(ConversationStrategy.ContinueListening);
        return proposalOnly
            ? new StrategyDecision(
                ConversationStrategy.ShowProposalSet,
                StrategyDecisionType.RequiresRegeneration,
                reason,
                AcceptResponseCandidate: false,
                AcceptProposalSetCandidate: false)
            : Downgrade(QuestionFallback(context), reason);
    }

    private static ConversationStrategy QuestionFallback(PolicyContext context) =>
        context.Snapshot.OpenQuestion is null
            ? ConversationStrategy.AskClarifyingQuestion
            : ConversationStrategy.ContinueListening;

    private static ConversationStrategy SafeFallbackStrategy(StrategyEnvelope envelope) =>
        envelope.AllowedStrategies.Contains(ConversationStrategy.DiscussExistingProposal)
        && !envelope.AllowedStrategies.Contains(ConversationStrategy.AskClarifyingQuestion)
            ? ConversationStrategy.DiscussExistingProposal
            : envelope.AllowedStrategies.Contains(ConversationStrategy.AskClarifyingQuestion)
                ? ConversationStrategy.AskClarifyingQuestion
                : ConversationStrategy.ContinueListening;

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
        GentleQuestionResponse r => r.Question,
        ClarifyingQuestionResponse r => r.Question,
        GoalChoiceResponse r => r.Question,
        _ => null,
    };
}
