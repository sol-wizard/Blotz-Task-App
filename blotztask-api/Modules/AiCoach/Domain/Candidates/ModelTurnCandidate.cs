using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Candidates;

/// <summary>
/// The model's structured output for one turn (v3 tech design §10). Everything in here is a
/// CANDIDATE: acceptance can commit conversation material, never user confirmation or business
/// success. Interpretations retain their source and semantic uncertainty after validation.
/// The model never returns free text outside this contract.
/// </summary>
public sealed record ModelTurnCandidate(
    InterpretationCandidate Interpretation,
    ConversationStrategy SuggestedAction,
    AssistantResponseCandidate ResponseCandidate,
    ProposalSetCandidate? ProposalSetCandidate,
    SupportMove? SuggestedSupportMove = null,
    ProposalSetMutationCandidate? ProposalSetMutationCandidate = null);

/// <summary>
/// What the model believes it understood (v3 tech design §10.1). Planning items, constraints,
/// and turn disposition remain untrusted claims after their required fields are validated.
/// Literal quote source matching is temporarily disabled.
/// </summary>
public sealed record InterpretationCandidate(
    IntentType Intent,
    IReadOnlyList<PlanningItemCandidate>? PlanningItems = null,
    IReadOnlyList<ConstraintCandidate>? Constraints = null,
    UserTurnDispositionCandidate? Disposition = null,
    ActionRequestCandidate? ActionRequest = null,
    SupportRequestCandidate? SupportRequest = null,
    IReadOnlyList<PlanningReferenceCandidate>? PlanningReferences = null);

/// <summary>A model-proposed item plus a literal quote used by Evidence Guard.</summary>
public sealed record PlanningItemCandidate(
    string Text,
    EvidenceReference Evidence,
    PlanningItemKind Kind = PlanningItemKind.Action);

public sealed record ConstraintCandidate(
    string Text,
    EvidenceReference Evidence);

public sealed record EvidenceReference(string Quote);

public sealed record ActionRequestCandidate(
    ActionRequestKind Kind,
    EvidenceReference? Evidence,
    string? ReferencedItemKey = null);

public sealed record PlanningReferenceCandidate(
    string ReferenceKey,
    PlanningReferenceKind Kind,
    EvidenceReference Evidence);

public enum PlanningReferenceKind
{
    Selected = 0,
    Rejected = 1,
    Superseded = 2,
}

public enum ActionRequestKind
{
    None = 0,
    ActionMention = 1,
    AdviceRequest = 2,
    ExplicitPlanningRequest = 3,
    DirectInstruction = 4,
    ReferencedInstruction = 5,
}

public sealed record SupportRequestCandidate(
    SupportRequestKind Kind,
    EvidenceReference? Evidence,
    SupportPreferenceScope Scope = SupportPreferenceScope.Turn);

public enum SupportPreferenceScope
{
    Turn = 0,
    Conversation = 1,
}

public enum SupportRequestKind
{
    Unspecified = 0,
    WantsListening = 1,
    WantsExploration = 2,
    WantsPerspective = 3,
    WantsAdvice = 4,
    RejectsAdvice = 5,
    WantsPause = 6,
    ClearsPreference = 7,
}

public enum SupportMove
{
    Acknowledge = 0,
    Reflect = 1,
    GentleQuestion = 2,
    OfferPerspective = 3,
    OfferAdvice = 4,
    RespectPause = 5,
}

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
/// one question field, never an array; this does not prove the text contains only one question.
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

/// <summary>A response accompanying an already validated pending-card mutation.</summary>
public sealed record ProposalUpdateResponse(string Text) : AssistantResponseCandidate(Text);

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

/// <summary>
/// A model candidate for changing the current pending card. The model only sees ephemeral
/// reference keys from the execution frame; it never receives or returns server proposal IDs.
/// Ambiguities are explicit so uncertainty cannot silently become a destructive operation.
/// </summary>
public sealed record ProposalSetMutationCandidate(
    string ArtifactReferenceKey,
    IReadOnlyList<ProposalMutationOperationCandidate> Operations,
    IReadOnlyList<ProposalMutationAmbiguityCandidate> Ambiguities);

public abstract record ProposalMutationOperationCandidate(
    string OperationKey,
    EvidenceReference Evidence);

public sealed record AddProposalItemCandidate(
    string OperationKey,
    TaskProposalCandidate Item,
    EvidenceReference Evidence)
    : ProposalMutationOperationCandidate(OperationKey, Evidence);

public sealed record UpdateProposalItemCandidate(
    string OperationKey,
    string TargetReferenceKey,
    ProposalItemPatchCandidate Patch,
    EvidenceReference Evidence)
    : ProposalMutationOperationCandidate(OperationKey, Evidence);

public sealed record RemoveProposalItemCandidate(
    string OperationKey,
    string TargetReferenceKey,
    EvidenceReference Evidence)
    : ProposalMutationOperationCandidate(OperationKey, Evidence);

public enum ProposalField
{
    Title = 0,
    Description = 1,
    Date = 2,
    StartTime = 3,
    EndTime = 4,
    LabelId = 5,
}

/// <summary>
/// ChangedFields distinguishes an omitted field from an explicit clear. Null is a valid
/// replacement only for Description and LabelId.
/// </summary>
public sealed record ProposalItemPatchCandidate(
    IReadOnlySet<ProposalField> ChangedFields,
    string? Title = null,
    string? Description = null,
    DateOnly? Date = null,
    TimeOnly? StartTime = null,
    TimeOnly? EndTime = null,
    int? LabelId = null);

public sealed record ProposalMutationAmbiguityCandidate(
    ProposalMutationAmbiguityKind Kind,
    IReadOnlyList<string> CandidateReferenceKeys,
    ProposalField? Field,
    EvidenceReference Evidence);

public enum ProposalMutationAmbiguityKind
{
    TargetUnclear = 0,
    OperationUnclear = 1,
    FieldUnclear = 2,
    ReplacementValueMissing = 3,
    MultipleTargetsPossible = 4,
    ConflictingInstructions = 5,
}
