using BlotzTask.Modules.AiCoach.Domain.Artifacts;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Immutable read model handed to the Reducer and Capability Guard (tech design §9.1).
/// Rules only ever read this — never tracked entities, never the store.
/// </summary>
public sealed record ConversationSnapshot(
    Guid ConversationId,
    Guid UserId,
    AiCoachMode Mode,
    ConversationLifecycleStatus LifecycleStatus,
    ConversationState State,
    GenerationStatus GenerationStatus,
    BlockedReason BlockedReason,
    int Version,
    CurrentArtifactSnapshot? CurrentArtifact,
    ClarificationProgress Clarification,
    IReadOnlySet<ConversationAction> AllowedActions);

/// <summary>Read-only view of the current artifact inside a snapshot.</summary>
public sealed record CurrentArtifactSnapshot(
    Guid Id,
    ArtifactType Type,
    int SchemaVersion,
    int Version,
    ArtifactStatus Status,
    ArtifactPayload Payload);

/// <summary>
/// Tracks clarification rounds (requirements §8.1: at most one core question per turn;
/// after two consecutive rounds without time information the model must propose a
/// conservative plan instead of asking again).
/// </summary>
public sealed record ClarificationProgress(int RoundsAsked)
{
    public static readonly ClarificationProgress None = new(0);
}
