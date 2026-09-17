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
            // An open card must be resolved through its controls before another is created.
            var strategies = new HashSet<ConversationStrategy>
            {
                ConversationStrategy.ContinueListening,
                ConversationStrategy.AskGentleQuestion,
                ConversationStrategy.DiscussExistingProposal,
            };
            if (policy.AllowsModelProposalSetUpdates)
            {
                strategies.Add(ConversationStrategy.AskClarifyingQuestion);
                strategies.Add(ConversationStrategy.UpdateProposalSet);
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
                ConversationStrategy.AskClarifyingQuestion,
                ConversationStrategy.AskUserToChooseGoal,
            };
            // PlanningAuthorityCalculator alone owns clarification eligibility. The envelope
            // describes implemented capabilities, not product preferences or question cadence.
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
