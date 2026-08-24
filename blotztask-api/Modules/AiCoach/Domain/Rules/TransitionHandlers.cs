using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Rules;

/// <summary>
/// User sent a chat message. Valid from every interactive state; always results in one
/// model-turn effect with generation marked Running (state itself does not change until the
/// model result arrives — generation progress is orthogonal, tech design §10).
/// </summary>
public sealed class UserMessageReceivedHandler : IConversationTransitionHandler<UserMessageReceived>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.Conversing,
        ConversationState.Clarifying,
        ConversationState.DraftPending,
        ConversationState.DraftHandled,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        UserMessageReceived input,
        AiCoachModeDefinition mode)
    {
        // One generation at a time per conversation (§17.1).
        if (current.GenerationStatus == GenerationStatus.Running)
            return TransitionResult.Rejected(RuleViolation.GenerationInProgress);

        // Quota exhaustion is terminal for model calls this month; other block reasons are
        // retryable by sending again (requirements §15).
        if (current.GenerationStatus == GenerationStatus.Blocked && current.BlockedReason == BlockedReason.Quota)
            return TransitionResult.Rejected(RuleViolation.GenerationBlocked);

        // A finished draft round starts a fresh conversing round.
        var nextState = current.State == ConversationState.DraftHandled
            ? ConversationState.Conversing
            : current.State;

        return TransitionResult.MoveTo(
            nextState,
            GenerationStatus.Running,
            ActionSets.None,
            mutations: [new AppendUserMessageMutation(input.MessageId, input.Content)],
            effects: [new GenerateModelTurnEffectRequest(input.MessageId)]);
    }
}

/// <summary>
/// A model turn finished. In Execution mode a turn that proposed a (guard-approved) draft moves
/// to DraftPending; a turn without a draft is by definition a clarification question
/// (requirements §8.1) unless a draft is already pending, in which case the draft stays
/// untouched (§19.3).
/// </summary>
public sealed class ModelTurnCompletedHandler : IConversationTransitionHandler<ModelTurnCompleted>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.Conversing,
        ConversationState.Clarifying,
        ConversationState.DraftPending,
        ConversationState.DraftHandled,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        ModelTurnCompleted input,
        AiCoachModeDefinition mode)
    {
        // Late/duplicate results must not overwrite newer state (§17.4).
        if (current.GenerationStatus != GenerationStatus.Running)
            return TransitionResult.Rejected(RuleViolation.StaleEffectResult);

        if (input.ProposedDraft is not null)
        {
            // Defense in depth: the guard already blocks a second draft inside the turn,
            // but the reducer independently refuses to accept one (§19.3).
            if (current.CurrentArtifact is { Status: ArtifactStatus.Pending or ArtifactStatus.Processing })
                return TransitionResult.Rejected(RuleViolation.StaleArtifact);

            return TransitionResult.MoveTo(
                ConversationState.DraftPending,
                GenerationStatus.Idle,
                ActionSets.ForPendingDraft(input.ProposedDraft),
                mutations:
                [
                    new AppendAssistantMessageMutation(input.AssistantMessage),
                    new CreateCurrentArtifactMutation(
                        ArtifactType.TaskDraft,
                        Capabilities.CreateTaskDraftsHandler.SchemaVersion,
                        input.ProposedDraft),
                    new ResetClarificationMutation(),
                ],
                events: [new DraftCreated(Guid.Empty)]);
        }

        // No draft proposed this turn.
        var (nextState, mutations) = current.State switch
        {
            // Pre-draft conversation: the reply is a clarification question.
            ConversationState.Conversing or ConversationState.Clarifying => (
                ConversationState.Clarifying,
                new List<DomainMutation>
                {
                    new AppendAssistantMessageMutation(input.AssistantMessage),
                    new IncrementClarificationRoundMutation(),
                }),

            // Draft on screen: plain reply, draft unchanged (§19.3).
            ConversationState.DraftPending => (
                ConversationState.DraftPending,
                new List<DomainMutation> { new AppendAssistantMessageMutation(input.AssistantMessage) }),

            // Post-draft chat continues a normal round.
            _ => (
                ConversationState.Conversing,
                new List<DomainMutation> { new AppendAssistantMessageMutation(input.AssistantMessage) }),
        };

        return TransitionResult.MoveTo(
            nextState,
            GenerationStatus.Idle,
            nextState == ConversationState.DraftPending
                ? ActionSets.ForPendingDraft(current.CurrentArtifact)
                : ActionSets.ChatOnly,
            mutations: mutations);
    }
}

/// <summary>
/// Model turn failed. Quota / content filter / model outage set GenerationStatus = Blocked with
/// a reason — never a fake conversation state (tech design §10). Transient errors return to Idle
/// so the user can retry.
/// </summary>
public sealed class ModelGenerationFailedHandler : IConversationTransitionHandler<ModelGenerationFailed>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.Conversing,
        ConversationState.Clarifying,
        ConversationState.DraftPending,
        ConversationState.DraftHandled,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        ModelGenerationFailed input,
        AiCoachModeDefinition mode)
    {
        if (current.GenerationStatus != GenerationStatus.Running)
            return TransitionResult.Rejected(RuleViolation.StaleEffectResult);

        var (generationStatus, blockedReason) = input.ErrorCode switch
        {
            AiGenerationErrorCode.QuotaExceeded => (GenerationStatus.Blocked, BlockedReason.Quota),
            AiGenerationErrorCode.ContentFiltered => (GenerationStatus.Blocked, BlockedReason.ContentFiltered),
            AiGenerationErrorCode.ModelUnavailable => (GenerationStatus.Blocked, BlockedReason.ModelUnavailable),
            AiGenerationErrorCode.ConfigurationError => (GenerationStatus.Blocked, BlockedReason.ConfigurationError),
            _ => (GenerationStatus.Idle, BlockedReason.None),
        };

        var actions = blockedReason == BlockedReason.Quota
            ? ActionSets.None
            : current.State == ConversationState.DraftPending
                ? ActionSets.ForPendingDraft(current.CurrentArtifact)
                : ActionSets.ChatOnly;

        return TransitionResult.MoveTo(
            current.State,
            generationStatus,
            actions,
            blockedReason: blockedReason,
            events: blockedReason == BlockedReason.Quota ? [new QuotaBlocked()] : []);
    }
}

/// <summary>
/// User confirmed the current draft (start_now / add_to_task_list). Snapshot-level
/// checks per §22.6; field validation already happened in the Application layer. Moves the
/// artifact to Processing and requests the PersistDraft effect ("transaction A", §22.9).
/// </summary>
public sealed class ConfirmTaskDraftRequestedHandler : IConversationTransitionHandler<ConfirmTaskDraftRequested>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.DraftPending,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        ConfirmTaskDraftRequested input,
        AiCoachModeDefinition mode)
    {
        if (current.GenerationStatus == GenerationStatus.Running)
            return TransitionResult.Rejected(RuleViolation.GenerationInProgress);

        if (current.CurrentArtifact is null || current.CurrentArtifact.Id != input.ArtifactId)
            return TransitionResult.Rejected(RuleViolation.StaleArtifact);

        if (current.CurrentArtifact.Status != ArtifactStatus.Pending)
            return TransitionResult.Rejected(RuleViolation.InvalidState);

        if (!current.AllowedActions.Contains(input.Action))
            return TransitionResult.Rejected(RuleViolation.ActionNotAllowed);

        // A focus timer is for one task: start_now is only valid when the card (after the
        // user's edits) holds exactly one.
        if (input.Action == ConversationAction.StartNow && !input.ValidatedDraft.Payload.IsSingle)
            return TransitionResult.Rejected(RuleViolation.ActionNotAllowed);

        return TransitionResult.MoveTo(
            ConversationState.DraftPending,
            GenerationStatus.Idle,
            ActionSets.None,
            mutations:
            [
                new UpdateCurrentArtifactPayloadMutation(input.ArtifactId, input.ValidatedDraft.Payload),
                new UpdateCurrentArtifactStatusMutation(input.ArtifactId, ArtifactStatus.Processing),
            ],
            effects: [new PersistDraftEffectRequest(input.ArtifactId, input.Action, input.ValidatedDraft)]);
    }
}

/// <summary>User rejected the draft: terminal Rejected, current artifact cleared, back to chat (§22.8).</summary>
public sealed class RejectTaskDraftRequestedHandler : IConversationTransitionHandler<RejectTaskDraftRequested>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.DraftPending,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        RejectTaskDraftRequested input,
        AiCoachModeDefinition mode)
    {
        if (current.GenerationStatus == GenerationStatus.Running)
            return TransitionResult.Rejected(RuleViolation.GenerationInProgress);

        if (current.CurrentArtifact is null || current.CurrentArtifact.Id != input.ArtifactId)
            return TransitionResult.Rejected(RuleViolation.StaleArtifact);

        if (current.CurrentArtifact.Status != ArtifactStatus.Pending)
            return TransitionResult.Rejected(RuleViolation.InvalidState);

        return TransitionResult.MoveTo(
            ConversationState.Conversing,
            GenerationStatus.Idle,
            ActionSets.ChatOnly,
            mutations:
            [
                new UpdateCurrentArtifactStatusMutation(input.ArtifactId, ArtifactStatus.Rejected),
                new ClearCurrentArtifactMutation(input.ArtifactId),
            ],
            events: [new DraftRejected(input.ArtifactId)]);
    }
}

/// <summary>Every task on the card created: artifact Accepted, conversation DraftHandled ("transaction B", §22.9).</summary>
public sealed class DraftPersistenceSucceededHandler : IConversationTransitionHandler<DraftPersistenceSucceeded>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.DraftPending,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        DraftPersistenceSucceeded input,
        AiCoachModeDefinition mode)
    {
        if (current.CurrentArtifact is null || current.CurrentArtifact.Id != input.ArtifactId)
            return TransitionResult.Rejected(RuleViolation.StaleArtifact);

        if (current.CurrentArtifact.Status != ArtifactStatus.Processing)
            return TransitionResult.Rejected(RuleViolation.InvalidState);

        if (input.PersistedItems.Count == 0)
            return TransitionResult.Rejected(RuleViolation.InvalidState);

        var mutations = new List<DomainMutation>();
        foreach (var item in input.PersistedItems)
            mutations.Add(new RecordPersistedTaskMutation(input.ArtifactId, item.ItemId, item.TaskId));
        mutations.Add(new UpdateCurrentArtifactStatusMutation(input.ArtifactId, ArtifactStatus.Accepted));

        return TransitionResult.MoveTo(
            ConversationState.DraftHandled,
            GenerationStatus.Idle,
            ActionSets.ChatOnly,
            mutations: mutations,
            events: [new DraftPersisted(input.ArtifactId, input.PersistedItems.Select(i => i.TaskId).ToList())]);
    }
}

/// <summary>
/// Task creation failed (for at least one item): draft recovers to Pending with the user's
/// edited fields intact and the draft actions re-enabled for retry (§19.4/§22.8). Items that
/// were created before the failure are recorded so the retry skips them. The model must never
/// claim the task saved.
/// </summary>
public sealed class DraftPersistenceFailedHandler : IConversationTransitionHandler<DraftPersistenceFailed>
{
    public IReadOnlySet<ConversationState> SupportedStates { get; } = new HashSet<ConversationState>
    {
        ConversationState.DraftPending,
    };

    public TransitionResult Reduce(
        ConversationSnapshot current,
        DraftPersistenceFailed input,
        AiCoachModeDefinition mode)
    {
        if (current.CurrentArtifact is null || current.CurrentArtifact.Id != input.ArtifactId)
            return TransitionResult.Rejected(RuleViolation.StaleArtifact);

        if (current.CurrentArtifact.Status != ArtifactStatus.Processing)
            return TransitionResult.Rejected(RuleViolation.InvalidState);

        var mutations = new List<DomainMutation>();
        foreach (var item in input.PersistedItems)
            mutations.Add(new RecordPersistedTaskMutation(input.ArtifactId, item.ItemId, item.TaskId));
        mutations.Add(new UpdateCurrentArtifactStatusMutation(input.ArtifactId, ArtifactStatus.Pending));

        return TransitionResult.MoveTo(
            ConversationState.DraftPending,
            GenerationStatus.Idle,
            ActionSets.ForPendingDraft(current.CurrentArtifact),
            mutations: mutations);
    }
}
