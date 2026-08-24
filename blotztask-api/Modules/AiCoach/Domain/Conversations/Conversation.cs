using BlotzTask.Modules.AiCoach.Domain.Artifacts;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The conversation aggregate held by <c>IConversationStore</c>. For v1 Execution mode this
/// lives in memory only (open question §29.1 — Ben approved the IMemoryCache store; swapping
/// to a database later replaces the store implementation, not this type).
///
/// All writes go through <see cref="ApplyTransition"/> so that every change is the result of a
/// reducer-approved <see cref="TransitionResult"/>. The kernel serializes access per conversation.
/// </summary>
public sealed class Conversation
{
    public required Guid Id { get; init; }
    public required Guid UserId { get; init; }
    public required AiCoachMode Mode { get; init; }
    public required string TimeZoneId { get; init; }

    // Versions fixed at creation (tech design §13/§25.8): an active conversation never
    // silently switches prompt/rule/toolset versions on deploy.
    public required string PromptVersion { get; init; }
    public required string RuleVersion { get; init; }
    public required string ToolsetVersion { get; init; }
    public required int ExecutionFrameVersion { get; init; }

    public ConversationLifecycleStatus LifecycleStatus { get; private set; } = ConversationLifecycleStatus.Active;
    public ConversationState State { get; private set; } = ConversationState.Conversing;
    public GenerationStatus GenerationStatus { get; private set; } = GenerationStatus.Idle;
    public BlockedReason BlockedReason { get; private set; } = BlockedReason.None;
    public int Version { get; private set; }
    public ClarificationProgress Clarification { get; private set; } = ClarificationProgress.None;
    public ConversationArtifact? CurrentArtifact { get; private set; }
    public IReadOnlySet<ConversationAction> AllowedActions { get; private set; } =
        new HashSet<ConversationAction> { ConversationAction.SendMessage };

    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public required DateTimeOffset ExpiresAt { get; init; }

    private readonly List<ConversationMessage> _messages = [];
    public IReadOnlyList<ConversationMessage> Messages => _messages;

    private readonly List<TrackedEffect> _effects = [];
    public IReadOnlyList<TrackedEffect> Effects => _effects;

    private readonly Dictionary<Guid, CommandReceipt> _receipts = [];
    public IReadOnlyDictionary<Guid, CommandReceipt> Receipts => _receipts;

    /// <summary>Recent-turn window (requirements §14.2). Execution mode has no summary compression in v1.</summary>
    public const int RecentTurnLimit = 20;

    public ConversationSnapshot ToSnapshot() => new(
        Id,
        UserId,
        Mode,
        LifecycleStatus,
        State,
        GenerationStatus,
        BlockedReason,
        Version,
        CurrentArtifact?.ToSnapshot(),
        Clarification,
        AllowedActions);

    public TrackedEffect? FindEffect(Guid effectId) => _effects.FirstOrDefault(e => e.Id == effectId);

    public bool HasActiveGenerationEffect() =>
        _effects.Any(e => e.Request is GenerateModelTurnEffectRequest
                          && e.Status is EffectStatus.Pending or EffectStatus.Running);

    /// <summary>
    /// Applies an accepted transition: mutations, new state dimensions, allowed actions, and the
    /// version bump. Requested effects are materialized into tracked effects and returned so the
    /// dispatcher can run them after this "transaction A" completes (tech design §16.1).
    /// </summary>
    public IReadOnlyList<TrackedEffect> ApplyTransition(TransitionResult result, DateTimeOffset now)
    {
        if (!result.IsAccepted)
            throw new InvalidOperationException("Only accepted transitions can be applied.");

        foreach (var mutation in result.Mutations)
            Apply(mutation, now);

        State = result.NextState;
        GenerationStatus = result.NextGenerationStatus;
        BlockedReason = result.NextBlockedReason;
        AllowedActions = result.AllowedActions;
        Version++;
        UpdatedAt = now;

        var materialized = new List<TrackedEffect>();
        foreach (var request in result.Effects)
        {
            var effect = new TrackedEffect
            {
                Id = Guid.NewGuid(),
                Request = request,
                BaseConversationVersion = Version,
                IdempotencyKey = request switch
                {
                    PersistDraftEffectRequest persist => $"confirm-draft:{persist.ArtifactId}",
                    GenerateModelTurnEffectRequest turn => $"model-turn:{turn.TriggeringMessageId}",
                    _ => Guid.NewGuid().ToString("N"),
                },
                CreatedAt = now,
            };

            // Idempotency guard (§17.4): the same key must not spawn a second effect.
            if (_effects.Any(e => e.IdempotencyKey == effect.IdempotencyKey
                                  && e.Status is EffectStatus.Pending or EffectStatus.Running or EffectStatus.Completed))
                continue;

            _effects.Add(effect);
            materialized.Add(effect);
        }

        return materialized;
    }

    private void Apply(DomainMutation mutation, DateTimeOffset now)
    {
        switch (mutation)
        {
            case AppendUserMessageMutation m:
                AppendMessage(new ConversationMessage(m.MessageId, ConversationMessageRole.User, m.Content, now));
                break;

            case AppendAssistantMessageMutation m:
                AppendMessage(new ConversationMessage(Guid.NewGuid(), ConversationMessageRole.Assistant, m.Content, now));
                break;

            case CreateCurrentArtifactMutation m:
                // Domain invariant (§21.5): at most one Pending/Processing artifact; the current
                // artifact must reach a terminal state before a new one is created.
                if (CurrentArtifact is { Status: ArtifactStatus.Pending or ArtifactStatus.Processing })
                    throw new InvalidOperationException("A pending draft already exists for this conversation.");
                CurrentArtifact = new ConversationArtifact(m.Payload)
                {
                    Id = Guid.NewGuid(),
                    Type = m.Type,
                    SchemaVersion = m.SchemaVersion,
                    CreatedAt = now,
                };
                break;

            case UpdateCurrentArtifactStatusMutation m:
                RequireCurrentArtifact(m.ArtifactId).SetStatus(m.Status, now);
                break;

            case UpdateCurrentArtifactPayloadMutation m:
                RequireCurrentArtifact(m.ArtifactId).SetPayload(m.Payload, now);
                break;

            case RecordPersistedTaskMutation m:
                RequireCurrentArtifact(m.ArtifactId).SetPersistedTask(m.ItemId, m.PersistedTaskId, now);
                break;

            case ClearCurrentArtifactMutation m:
                RequireCurrentArtifact(m.ArtifactId);
                CurrentArtifact = null;
                break;

            case IncrementClarificationRoundMutation:
                Clarification = new ClarificationProgress(Clarification.RoundsAsked + 1);
                break;

            case ResetClarificationMutation:
                Clarification = ClarificationProgress.None;
                break;

            default:
                throw new InvalidOperationException($"Unsupported mutation {mutation.GetType().Name}.");
        }
    }

    private ConversationArtifact RequireCurrentArtifact(Guid artifactId)
    {
        if (CurrentArtifact is null || CurrentArtifact.Id != artifactId)
            throw new InvalidOperationException("Mutation targets an artifact that is not the current artifact.");
        return CurrentArtifact;
    }

    private void AppendMessage(ConversationMessage message)
    {
        _messages.Add(message);
        // Keep only the recent-turn window; Execution mode drops older detail (no summary in v1).
        var maxMessages = RecentTurnLimit * 2;
        if (_messages.Count > maxMessages)
            _messages.RemoveRange(0, _messages.Count - maxMessages);
    }

    public void RecordReceipt(CommandReceipt receipt) => _receipts[receipt.CommandId] = receipt;

    public void CompleteReceipt(Guid commandId, CommandReceiptStatus status, object? result)
    {
        if (_receipts.TryGetValue(commandId, out var receipt))
            _receipts[commandId] = receipt with { Status = status, Result = result };
    }
}

public enum ConversationMessageRole
{
    User = 0,
    Assistant = 1,
}

public sealed record ConversationMessage(
    Guid Id,
    ConversationMessageRole Role,
    string Content,
    DateTimeOffset At);

/// <summary>Mutable artifact tracked by the aggregate (header + strongly-typed payload, §21.6).</summary>
public sealed class ConversationArtifact(ArtifactPayload payload)
{
    public required Guid Id { get; init; }
    public required ArtifactType Type { get; init; }
    public required int SchemaVersion { get; init; }
    public ArtifactPayload Payload { get; private set; } = payload;
    public ArtifactStatus Status { get; private set; } = ArtifactStatus.Pending;
    public int Version { get; private set; } = 1;
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public CurrentArtifactSnapshot ToSnapshot() => new(Id, Type, SchemaVersion, Version, Status, Payload);

    internal void SetStatus(ArtifactStatus status, DateTimeOffset now)
    {
        // Terminal artifacts never change again (§21.5), with the single allowed recovery
        // Processing -> Pending after a failed persistence attempt.
        if (Status is ArtifactStatus.Accepted or ArtifactStatus.Rejected or ArtifactStatus.Superseded or ArtifactStatus.Expired)
            throw new InvalidOperationException($"Artifact in terminal state {Status} cannot transition to {status}.");
        Status = status;
        Version++;
        UpdatedAt = now;
    }

    internal void SetPayload(ArtifactPayload payload, DateTimeOffset now)
    {
        if (Status is not (ArtifactStatus.Pending or ArtifactStatus.Processing))
            throw new InvalidOperationException("Only pending/processing artifacts can be edited.");
        Payload = payload;
        Version++;
        UpdatedAt = now;
    }

    /// <summary>
    /// Records a created formal task on one draft item. Allowed in Processing (normal flow)
    /// and as the last write before Accepted/Pending — it does not bump the artifact version
    /// because it is not a user-visible edit.
    /// </summary>
    internal void SetPersistedTask(Guid itemId, int taskId, DateTimeOffset now)
    {
        if (Payload is not TaskDraftPayload draft)
            throw new InvalidOperationException("Only task drafts record persisted tasks.");
        if (draft.Items.All(i => i.ItemId != itemId))
            throw new InvalidOperationException("Persisted task targets an item that is not on the draft.");
        Payload = draft.WithPersistedTask(itemId, taskId);
        UpdatedAt = now;
    }
}

/// <summary>In-memory stand-in for the AiConversationEffect run record (§17.4).</summary>
public sealed class TrackedEffect
{
    public required Guid Id { get; init; }
    public required ConversationEffectRequest Request { get; init; }
    public required int BaseConversationVersion { get; init; }
    public required string IdempotencyKey { get; init; }
    public EffectStatus Status { get; private set; } = EffectStatus.Pending;
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? LastErrorCode { get; private set; }

    public void MarkRunning() => Status = EffectStatus.Running;

    public void MarkCompleted(DateTimeOffset now)
    {
        Status = EffectStatus.Completed;
        CompletedAt = now;
    }

    public void MarkFailed(DateTimeOffset now, string errorCode)
    {
        Status = EffectStatus.Failed;
        CompletedAt = now;
        LastErrorCode = errorCode;
    }

    public void MarkSuperseded(DateTimeOffset now)
    {
        Status = EffectStatus.Superseded;
        CompletedAt = now;
    }
}

public enum CommandReceiptStatus
{
    Pending = 0,
    Succeeded = 1,
    Failed = 2,
}

/// <summary>In-memory stand-in for AiCoachCommandReceipt (§22.5): replay-safe user commands.</summary>
public sealed record CommandReceipt(
    Guid CommandId,
    Guid ArtifactId,
    string CommandType,
    string RequestHash,
    CommandReceiptStatus Status,
    object? Result);
