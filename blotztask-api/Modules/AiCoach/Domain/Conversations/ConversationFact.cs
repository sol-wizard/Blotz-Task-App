namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Orthogonal, recoverable system facts (v3 tech design §6.1). Facts only record what Policy or
/// Guards need later; they are set and removed exclusively by Kernel transitions — never by the
/// model, and never derived from model inference alone.
/// </summary>
public enum ConversationFact
{
    HasOpenQuestion = 0,
    HasConfirmedGoal = 1,
    HasPendingProposalSet = 2,
    HasProcessingProposalSet = 3,
    HasRunningModelEffect = 4,
    HasChangedGoal = 5,
    HasBlockedGeneration = 6,
    HasAcceptedProposal = 7,
    HasRejectedProposal = 8,
}
