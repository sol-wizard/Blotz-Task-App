using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Candidates;

/// <summary>
/// The model's structured output for one turn (v3 tech design §10). Everything in here is a
/// CANDIDATE: it becomes business fact only after Post-Policy, the Guards and the Kernel accept
/// it. The model never returns free text outside this contract.
/// </summary>
public sealed record ModelTurnCandidate(
    InterpretationSignals Signals,
    ConversationStrategy StrategyCandidate,
    AssistantResponseCandidate ResponseCandidate,
    ProposalSetCandidate? ProposalSetCandidate);

/// <summary>
/// What the model believes it understood (v3 tech design §10.1), reduced to the signals v1
/// policy actually consumes. <see cref="ActionIntentQuote"/> is the UserExplicit evidence for
/// <see cref="UserExpressedActionIntent"/>: a literal quote from the CURRENT user message,
/// verified by the Evidence Guard — model inference alone can never open the proposal path.
/// </summary>
public sealed record InterpretationSignals(
    IntentType Intent,
    bool UserExpressedActionIntent,
    string? ActionIntentQuote,
    bool UserRejectedAction,
    bool CoachDecompositionAuthorized = false,
    IReadOnlyList<PlanningItemCandidate>? PlanningItems = null,
    string? Constraint = null,
    string? ConstraintEvidenceQuote = null,
    ClarificationDisposition ClarificationDisposition = ClarificationDisposition.NotApplicable);

/// <summary>A model-proposed item plus a literal quote used by Evidence Guard.</summary>
public sealed record PlanningItemCandidate(
    string Text,
    string EvidenceQuote,
    PlanningItemKind Kind = PlanningItemKind.Action);

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
