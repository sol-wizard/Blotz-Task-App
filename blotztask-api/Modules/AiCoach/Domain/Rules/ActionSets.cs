using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Domain.Rules;

/// <summary>
/// Canonical allowedActions sets. Computed server-side only — the client renders exactly
/// what it receives (tech design §18).
/// </summary>
internal static class ActionSets
{
    /// <summary>Nothing can be submitted (generation or confirmation in flight, or quota-blocked).</summary>
    public static readonly IReadOnlySet<ConversationAction> None =
        new HashSet<ConversationAction>();

    public static readonly IReadOnlySet<ConversationAction> ChatOnly =
        new HashSet<ConversationAction> { ConversationAction.SendMessage };

    /// <summary>A single-task draft is on screen: start now, add to list, reject, and free chat.</summary>
    private static readonly IReadOnlySet<ConversationAction> SingleDraftPending =
        new HashSet<ConversationAction>
        {
            ConversationAction.SendMessage,
            ConversationAction.StartNow,
            ConversationAction.AddToTaskList,
            ConversationAction.RejectDraft,
        };

    /// <summary>
    /// A multi-task draft is on screen. No "start now": a focus timer is for one task, and
    /// the user can start any of them from the task list after saving.
    /// </summary>
    private static readonly IReadOnlySet<ConversationAction> BatchDraftPending =
        new HashSet<ConversationAction>
        {
            ConversationAction.SendMessage,
            ConversationAction.AddToTaskList,
            ConversationAction.RejectDraft,
        };

    public static IReadOnlySet<ConversationAction> ForPendingDraft(ArtifactPayload payload) =>
        payload is TaskDraftPayload { IsSingle: false } ? BatchDraftPending : SingleDraftPending;

    public static IReadOnlySet<ConversationAction> ForPendingDraft(CurrentArtifactSnapshot? artifact) =>
        artifact is null ? ChatOnly : ForPendingDraft(artifact.Payload);
}
