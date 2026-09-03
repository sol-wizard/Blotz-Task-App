using BlotzTask.Modules.AiCoach.Domain.Candidates;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Recoverable working state for the plan currently being prepared. This is not a Task and does
/// not authorize a business side effect; it only preserves user-explicit planning context across
/// turns so policy does not have to reinterpret old messages.
/// </summary>
public sealed record ActivePlanningIntentSnapshot(
    Guid IntentId,
    Guid SourceMessageId,
    IReadOnlyList<PlanningItemSnapshot> Items,
    IReadOnlyList<PlanningConstraintSnapshot> Constraints,
    PlanningIntentStatus Status,
    IReadOnlySet<ClarificationTopic>? AskedTopics = null);

public sealed record PlanningItemSnapshot(
    string Text,
    string EvidenceQuote,
    Guid SourceMessageId,
    PlanningItemKind Kind = PlanningItemKind.Action);

public sealed record PlanningConstraintSnapshot(
    string Text,
    string EvidenceQuote,
    Guid SourceMessageId);

public enum PlanningIntentStatus
{
    Collecting = 0,
    ReadyForProposal = 1,
    ProposalPending = 2,
    Completed = 3,
    Rejected = 4,
    Superseded = 5,
    Abandoned = 6,
    Expired = 7,
}

public enum ClarificationTopic
{
    ConcreteStep = 0,
    Priority = 1,
    Scope = 2,
    Deadline = 3,
    Other = 4,
}

public enum UserTurnDisposition
{
    NotApplicable = 0,
    Answered = 1,
    CannotProvide = 2,
    DelegatedToCoach = 3,
    RejectedAction = 4,
}

public enum ClarificationResolution
{
    AwaitingAnswer = 0,
    Answered = 1,
    UserCannotProvide = 2,
    DelegatedToCoach = 3,
    Defaulted = 4,
    Superseded = 5,
}
