using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Candidates;

/// <summary>
/// The model's structured output for one turn (v3 tech design §10). Everything in here is a
/// CANDIDATE: it becomes business fact only after Post-Policy, the Guards and the Kernel accept
/// it. The model never returns free text outside this contract.
/// </summary>
public sealed record ModelTurnCandidate(
    InterpretationCandidate Interpretation,
    ConversationStrategy SuggestedAction,
    AssistantResponseCandidate ResponseCandidate,
    ProposalSetCandidate? ProposalSetCandidate);

/// <summary>
/// What the model believes it understood (v3 tech design §10.1). Planning items, constraints,
/// and turn disposition are untrusted claims until Evidence Guard verifies their literal quotes
/// against the current user message.
/// </summary>
public sealed record InterpretationCandidate(
    IntentType Intent,
    IReadOnlyList<PlanningItemCandidate>? PlanningItems = null,
    IReadOnlyList<ConstraintCandidate>? Constraints = null,
    UserTurnDispositionCandidate? Disposition = null);

/// <summary>A model-proposed item plus a literal quote used by Evidence Guard.</summary>
public sealed record PlanningItemCandidate(
    string Text,
    EvidenceReference Evidence,
    PlanningItemKind Kind = PlanningItemKind.Action);

public sealed record ConstraintCandidate(
    string Text,
    EvidenceReference Evidence);

public sealed record EvidenceReference(string Quote);

public sealed record UserTurnDispositionCandidate(
    UserTurnDisposition Kind,
    EvidenceReference? Evidence);

public enum PlanningItemKind
{
    Domain = 0,
    Goal = 1,
    Action = 2,
}

public enum IntentType
{
    Unknown = 0,
    SmallTalk = 1,
    Goal = 2,
    ConcreteAction = 3,
    Question = 4,
    Emotional = 5,
}

/// <summary>
/// Typed response candidates (v3 tech design §10.2). <c>Text</c> is always the COMPLETE reply
/// shown to the user; <c>Question</c>, where present, additionally carries just the single
/// question so the Kernel can track it as the conversation's OpenQuestion. The contract holds
/// one question, never an array — structure enforces the one-question product rule.
/// </summary>
public abstract record AssistantResponseCandidate(string Text);

public sealed record ListeningResponse(string Text) : AssistantResponseCandidate(Text);

public sealed record GentleQuestionResponse(
    string Text,
    string Question,
    ClarificationTopic Topic = ClarificationTopic.ConcreteStep) : AssistantResponseCandidate(Text);

public sealed record ClarifyingQuestionResponse(
    string Text,
    string Question,
    ClarificationTopic Topic = ClarificationTopic.ConcreteStep) : AssistantResponseCandidate(Text);

public sealed record GoalChoiceResponse(
    string Text,
    string Question,
    ClarificationTopic Topic = ClarificationTopic.Priority) : AssistantResponseCandidate(Text);

public sealed record ProposalIntroductionResponse(string Text) : AssistantResponseCandidate(Text);

/// <summary>
/// Candidate proposal payload (v3 tech design §11). Only user-editable content fields — the
/// server owns every identity/lifecycle field. Times are already parsed; the raw-string
/// validation happens in the model-output schema guard before this type exists.
/// </summary>
public sealed record ProposalSetCandidate(
    IReadOnlyList<TaskProposalCandidate> Proposals);

public sealed record TaskProposalCandidate(
    string ClientProposalKey,
    string Title,
    string? Description,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int? LabelId);
