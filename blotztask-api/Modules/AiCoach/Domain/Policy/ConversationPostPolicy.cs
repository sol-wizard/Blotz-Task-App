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
    bool ActionIntentEvidenceVerified);

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

        // 4. Proposal path: every gate of v3 §13.4 in order.
        if (strategy == ConversationStrategy.ShowProposalSet)
        {
            if (candidate.ProposalSetCandidate is null || candidate.ProposalSetCandidate.Proposals.Count == 0)
                return Downgrade(ConversationStrategy.AskClarifyingQuestion, StrategyReasonCode.ProposalSetMissing);

            if (!envelope.ProposalConstraints.ProposalAllowed)
                return Downgrade(SafeFallbackStrategy(envelope), StrategyReasonCode.PendingProposalSetAlreadyExists);

            if (envelope.ProposalConstraints.RequiresExplicitActionIntent)
            {
                if (!candidate.Signals.UserExpressedActionIntent || candidate.Signals.UserRejectedAction)
                    return Downgrade(ConversationStrategy.AskClarifyingQuestion, StrategyReasonCode.ExplicitActionIntentRequired);

                // The intent must be backed by a verified UserExplicit quote from the current
                // message — model inference alone never opens the proposal path (v3 §14.1).
                if (!context.ActionIntentEvidenceVerified)
                    return Downgrade(ConversationStrategy.AskClarifyingQuestion, StrategyReasonCode.EvidenceInvalid);
            }

            if (candidate.ProposalSetCandidate.Proposals.Count > envelope.ProposalConstraints.MaxProposals)
                return Downgrade(ConversationStrategy.AskClarifyingQuestion, StrategyReasonCode.ProposalSetInvalid);

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
