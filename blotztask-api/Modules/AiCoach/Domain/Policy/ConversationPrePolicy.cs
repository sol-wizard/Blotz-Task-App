using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Policy;

/// <summary>
/// Pre-Policy (v3 tech design §8): computes the Strategy Envelope for one model turn from
/// committed system facts ONLY. It never interprets the current user message and never uses
/// keyword heuristics — understanding is the model's job, deciding is Post-Policy's.
/// </summary>
public interface IConversationPrePolicy
{
    StrategyEnvelope Build(ConversationSnapshot snapshot, AiCoachModeDefinition mode);
}

public sealed class ConversationPrePolicy : IConversationPrePolicy
{
    public StrategyEnvelope Build(ConversationSnapshot snapshot, AiCoachModeDefinition mode)
    {
        var policy = mode.Policy;
        var hasOpenSet = snapshot.CurrentProposalSet is { IsOpen: true };

        IReadOnlySet<ConversationStrategy> allowed;
        bool proposalAllowed;

        if (hasOpenSet)
        {
            // One open Current ProposalSet is a hard invariant (v3 §13.8): no second card. The
            // model may only discuss the pending one; v1 keeps card edits client-local, so
            // Update/Supersede stay out of the envelope unless the policy version opts in.
            var strategies = new HashSet<ConversationStrategy>
            {
                ConversationStrategy.ContinueListening,
                ConversationStrategy.DiscussExistingProposal,
            };
            if (policy.AllowsModelProposalSetUpdates)
            {
                strategies.Add(ConversationStrategy.UpdateProposalSet);
                strategies.Add(ConversationStrategy.SupersedeProposalSet);
            }
            allowed = strategies;
            proposalAllowed = false;
        }
        else
        {
            // Readiness is material, not a command. Always let the current turn decline,
            // change topic or ask for a perspective before Post-Policy chooses a strategy.
            // Broad first-version envelope (v3 §8.3): don't pre-trim normal conversation paths.
            // Whether a ProposalSet is actually shown is decided later by evidence + Post-Policy
            // + Guards, not here.
            var strategies = new HashSet<ConversationStrategy>
            {
                ConversationStrategy.ContinueListening,
                ConversationStrategy.AskGentleQuestion,
            };
            // One clarification cycle gets one information-slot question. Once a question is
            // open, the next turn must use the answer or a safe default rather than ask again.
            var clarificationAttempts = snapshot.ActivePlanningIntent?.AskedTopics?.Count ?? 0;
            if (snapshot.OpenQuestion is null
                && clarificationAttempts < policy.Planning.MaxClarificationAttempts)
            {
                strategies.Add(ConversationStrategy.AskClarifyingQuestion);
                strategies.Add(ConversationStrategy.AskUserToChooseGoal);
            }
            if (policy.AllowsProposalCreation)
                strategies.Add(ConversationStrategy.ShowProposalSet);
            allowed = strategies;
            proposalAllowed = policy.AllowsProposalCreation;
        }

        return new StrategyEnvelope(
            TurnObjective: BuildTurnObjective(snapshot, hasOpenSet, mode),
            AllowedStrategies: allowed,
            AllowedCapabilities: mode.AllowedReadOnlyCapabilities,
            ResponseConstraints: new ResponseConstraints(
                MaxQuestions: policy.MaxQuestionsPerTurn,
                MaxResponseLength: policy.MaxResponseLength),
            ProposalConstraints: new ProposalConstraints(
                MaxProposals: policy.MaxProposalsPerSet,
                ProposalAllowed: proposalAllowed));
    }

    /// <summary>
    /// The single narrow objective of this turn, rendered into the Execution Frame. Wording is
    /// carried over from the validated execution-frame objectives. Clarification attempts are
    /// bounded by structured intent/topic state, not by comparing question strings.
    /// </summary>
    private static string BuildTurnObjective(
        ConversationSnapshot snapshot,
        bool hasOpenSet,
        AiCoachModeDefinition mode)
    {
        if (hasOpenSet)
            return mode.TurnObjectives.PendingProposal;

        if (snapshot.Phase == ConversationPhase.ActionPreparing)
            return mode.TurnObjectives.ActionPreparing;

        return mode.TurnObjectives.Default;
    }
}
