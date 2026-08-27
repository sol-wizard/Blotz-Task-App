using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Immutable read model of one conversation (v3 tech design §6). Policy, Guards and the Kernel
/// only ever read this — never tracked entities, never the store. The model sees even less: a
/// minimal Execution-Frame projection, never the snapshot itself.
/// </summary>
public sealed record ConversationSnapshot(
    Guid ConversationId,
    Guid UserId,
    AiCoachMode Mode,
    ConversationPhase Phase,
    GenerationStatus GenerationStatus,
    BlockedReason BlockedReason,
    int Version,
    ProposalSetSnapshot? CurrentProposalSet,
    OpenQuestionSnapshot? OpenQuestion,
    IReadOnlySet<ConversationFact> Facts,
    IReadOnlySet<ConversationAction> AllowedActions,
    ConversationRuntimeVersions RuntimeVersions,
    ActivePlanningIntentSnapshot? ActivePlanningIntent = null);

/// <summary>
/// A structured clarification bound to a planning intent and information slot. Attempts are
/// counted per intent + topic, rather than as a global conversation question counter.
/// </summary>
public sealed record OpenQuestionSnapshot(
    string Question,
    int RoundsAsked,
    Guid? PlanningIntentId = null,
    ClarificationTopic Topic = ClarificationTopic.ConcreteStep,
    ClarificationResolution Resolution = ClarificationResolution.AwaitingAnswer);

/// <summary>
/// Versions pinned when the conversation is created (v3 tech design §6): an active conversation
/// never silently switches rule/policy/prompt/toolset/memory/protocol semantics on deploy.
/// </summary>
public sealed record ConversationRuntimeVersions(
    string RuleVersion,
    string PolicyVersion,
    string PromptVersion,
    string ToolsetVersion,
    string MemoryProfileVersion,
    int ProtocolVersion);
