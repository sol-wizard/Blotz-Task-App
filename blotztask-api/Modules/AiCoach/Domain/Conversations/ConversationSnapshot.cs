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
    ConversationRuntimeVersions RuntimeVersions);

/// <summary>
/// The unanswered question the assistant asked, plus how many question rounds have been spent
/// (product rule: after two rounds without the missing information the model must propose a
/// conservative plan instead of asking again — enforced via the Execution Frame objective).
/// </summary>
public sealed record OpenQuestionSnapshot(string Question, int RoundsAsked);

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
