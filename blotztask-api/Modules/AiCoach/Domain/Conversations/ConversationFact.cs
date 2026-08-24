namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Orthogonal, recoverable system facts (v3 tech design §6.1). Facts only record what Policy or
/// Guards need later; they are set and removed exclusively by Kernel transitions — never by the
/// model, and never derived from model inference alone.
///
/// <see cref="HasExplicitActionIntentInCurrentTurn"/> is turn-scoped: it may only originate from
/// UserExplicit evidence in the current user message (Evidence Guard) and is cleared when the
/// turn commits.
/// </summary>
public enum ConversationFact
{
    HasOpenQuestion = 0,
    HasConfirmedGoal = 1,
    HasPendingProposalSet = 2,
    HasProcessingProposalSet = 3,
    HasRunningModelEffect = 4,
    HasExplicitActionIntentInCurrentTurn = 5,
    HasChangedGoal = 6,
    HasBlockedGeneration = 7,
    HasAcceptedProposal = 8,
    HasRejectedProposal = 9,
}
