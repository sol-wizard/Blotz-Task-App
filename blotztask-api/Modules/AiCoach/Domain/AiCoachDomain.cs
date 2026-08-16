using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.AiCoach.Domain;

public enum AiCoachMode { Execute, Clarify, Companion }
public enum ConversationLifecycleStatus { Active, Closed, Expired }
public enum ConversationState
{
    Idle, Conversing, Clarifying, AwaitingSuggestionConfirmation, DraftPending,
    DraftHandled, AwaitingIntegrationChoice, AwaitingNextChoice, Closed
}
public enum GenerationStatus { Idle, Running, Blocked }
public enum GenerationBlockedReason { Quota, ContentFiltered, ModelUnavailable, ConfigurationError, Other }
public enum ConversationMessageRole { User, Assistant }
public enum ArtifactType { TaskDraft, Suggestion, MicroAction }
public enum ArtifactStatus { Pending, Processing, Accepted, Rejected, Superseded, Expired }
public enum TaskDraftKind { OneOff }
public enum ConversationEffectStatus { Pending, Running, Completed, Failed, Superseded }

public interface IArtifactDetail;

public sealed class AiConversation
{
    private AiConversation() { }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public AiCoachMode Mode { get; private set; }
    public ConversationLifecycleStatus LifecycleStatus { get; private set; }
    public ConversationState State { get; private set; }
    public GenerationStatus GenerationStatus { get; private set; }
    public GenerationBlockedReason? BlockedReason { get; private set; }
    public int Version { get; private set; }
    public int LastTurnNumber { get; private set; }
    public Guid? CurrentArtifactId { get; private set; }
    public string? ActiveConversationSlot { get; private set; }
    public string RuleVersion { get; private set; } = string.Empty;
    public string PromptVersion { get; private set; } = string.Empty;
    public string ModelDeploymentPolicyVersion { get; private set; } = string.Empty;
    public int ExecutionFrameVersion { get; private set; }
    public string ToolsetVersion { get; private set; } = string.Empty;
    public int SummarySchemaVersion { get; private set; }
    public string MemoryProfileId { get; private set; } = string.Empty;
    public int MemoryProfileVersion { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? ExpiresAt { get; private set; }
    public byte[] RowVersion { get; private set; } = [];

    public AppUser? User { get; private set; }
    public AiConversationArtifact? CurrentArtifact { get; private set; }
    public ICollection<AiConversationMessage> Messages { get; private set; } = [];
    public ICollection<AiConversationArtifact> Artifacts { get; private set; } = [];
    public ICollection<AiConversationEffect> Effects { get; private set; } = [];

    public static AiConversation Create(
        Guid userId,
        AiCoachModeDefinition mode,
        DateTimeOffset now)
    {
        if (userId == Guid.Empty) throw new ArgumentException("User id is required.", nameof(userId));

        return new AiConversation
        {
            Id = Guid.NewGuid(), UserId = userId, Mode = mode.Mode,
            LifecycleStatus = ConversationLifecycleStatus.Active,
            State = ConversationState.Idle, GenerationStatus = GenerationStatus.Idle,
            Version = 1, ActiveConversationSlot = mode.ActiveConversationSlot,
            RuleVersion = mode.RuleVersion, PromptVersion = mode.PromptVersion,
            ModelDeploymentPolicyVersion = mode.ModelDeploymentPolicyVersion,
            ExecutionFrameVersion = mode.ExecutionFrameVersion,
            ToolsetVersion = mode.ToolsetVersion, SummarySchemaVersion = mode.SummarySchemaVersion,
            MemoryProfileId = mode.MemoryProfile.Id, MemoryProfileVersion = mode.MemoryProfile.Version,
            CreatedAt = now, UpdatedAt = now,
            ExpiresAt = mode.PersistencePolicy == ConversationPersistencePolicy.ShortLived
                ? now.Add(mode.Lifetime ?? TimeSpan.FromHours(24)) : null
        };
    }

    public void ApplyTransition(
        ConversationState state,
        GenerationStatus generationStatus,
        GenerationBlockedReason? blockedReason,
        DateTimeOffset now)
    {
        State = state;
        GenerationStatus = generationStatus;
        BlockedReason = blockedReason;
        Version++;
        UpdatedAt = now;
    }

    public AiConversationMessage AddUserMessage(Guid id, string content, DateTimeOffset createdAt)
    {
        LastTurnNumber++;
        var message = AiConversationMessage.CreateUser(id, Id, LastTurnNumber, content, createdAt);
        Messages.Add(message);
        return message;
    }

    public AiConversationMessage AddAssistantMessage(Guid id, string content, DateTimeOffset createdAt)
    {
        if (LastTurnNumber < 1)
            throw new InvalidOperationException("An assistant message requires a current user turn.");
        var message = AiConversationMessage.CreateAssistant(id, Id, LastTurnNumber, content, createdAt);
        Messages.Add(message);
        return message;
    }

    public void SetCurrentArtifact(AiConversationArtifact artifact)
    {
        if (LifecycleStatus != ConversationLifecycleStatus.Active)
            throw new InvalidOperationException("A closed or expired conversation cannot accept an artifact.");
        if (artifact.ConversationId != Id)
            throw new InvalidOperationException("The artifact must belong to this conversation.");
        if (CurrentArtifactId is not null)
            throw new InvalidOperationException("The current artifact must be resolved before another artifact is selected.");

        CurrentArtifactId = artifact.Id;
        CurrentArtifact = artifact;
    }

    public void ClearCurrentArtifact(AiConversationArtifact artifact)
    {
        if (CurrentArtifactId != artifact.Id)
            throw new InvalidOperationException("Only the current artifact can be cleared.");
        if (!artifact.IsTerminal)
            throw new InvalidOperationException("The current artifact must be terminal before it is cleared.");

        CurrentArtifactId = null;
        CurrentArtifact = null;
    }

    public bool IsExpiredAt(DateTimeOffset now) =>
        LifecycleStatus == ConversationLifecycleStatus.Active && ExpiresAt is not null && ExpiresAt <= now;

    public void Expire(DateTimeOffset now)
    {
        if (LifecycleStatus != ConversationLifecycleStatus.Active) return;
        LifecycleStatus = ConversationLifecycleStatus.Expired;
        State = ConversationState.Closed;
        GenerationStatus = GenerationStatus.Idle;
        BlockedReason = null;
        ActiveConversationSlot = null;
        Version++;
        UpdatedAt = now;
    }
}

public sealed class AiConversationMessage
{
    private AiConversationMessage() { }
    public Guid Id { get; private set; }
    public Guid ConversationId { get; private set; }
    public int TurnNumber { get; private set; }
    public int Sequence { get; private set; }
    public ConversationMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public Guid? ArtifactId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public AiConversation? Conversation { get; private set; }
    public AiConversationArtifact? Artifact { get; private set; }

    public static AiConversationMessage CreateUser(
        Guid id, Guid conversationId, int turnNumber, string content, DateTimeOffset createdAt) =>
        new()
        {
            Id = id, ConversationId = conversationId, TurnNumber = turnNumber, Sequence = 1,
            Role = ConversationMessageRole.User, Content = content, CreatedAt = createdAt
        };

    public static AiConversationMessage CreateAssistant(
        Guid id, Guid conversationId, int turnNumber, string content, DateTimeOffset createdAt) =>
        new()
        {
            Id = id, ConversationId = conversationId, TurnNumber = turnNumber, Sequence = 2,
            Role = ConversationMessageRole.Assistant, Content = content, CreatedAt = createdAt
        };
}

public sealed class AiConversationArtifact
{
    private AiConversationArtifact() { }
    public Guid Id { get; private set; }
    public Guid ConversationId { get; private set; }
    public ArtifactType Type { get; private set; }
    public int SchemaVersion { get; private set; }
    public int Version { get; private set; }
    public ArtifactStatus Status { get; private set; }
    public Guid? CreatedByEffectId { get; private set; }
    public Guid? SupersedesArtifactId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? ExpiresAt { get; private set; }
    public byte[] RowVersion { get; private set; } = [];
    public bool IsTerminal => Status is ArtifactStatus.Accepted or ArtifactStatus.Rejected
        or ArtifactStatus.Superseded or ArtifactStatus.Expired;
    public AiConversation? Conversation { get; private set; }
    public AiConversationArtifact? SupersedesArtifact { get; private set; }
    public AiConversationEffect? CreatedByEffect { get; private set; }
    public IArtifactDetail? Detail { get; private set; }

    public static AiConversationArtifact Create(
        Guid conversationId, ArtifactType type, int schemaVersion, DateTimeOffset now, Guid? effectId = null) =>
        new()
        {
            Id = Guid.NewGuid(), ConversationId = conversationId, Type = type,
            SchemaVersion = schemaVersion, Version = 1, Status = ArtifactStatus.Pending,
            CreatedByEffectId = effectId, CreatedAt = now, UpdatedAt = now
        };

    public void StartProcessing(DateTimeOffset now) => Transition(ArtifactStatus.Pending, ArtifactStatus.Processing, now);
    public void Accept(DateTimeOffset now) => Transition(ArtifactStatus.Processing, ArtifactStatus.Accepted, now);
    public void ReturnToPending(DateTimeOffset now) => Transition(ArtifactStatus.Processing, ArtifactStatus.Pending, now);
    public void Reject(DateTimeOffset now) => Transition(ArtifactStatus.Pending, ArtifactStatus.Rejected, now);

    public void AttachDetail(IArtifactDetail detail)
    {
        Detail = detail ?? throw new ArgumentNullException(nameof(detail));
    }

    private void Transition(ArtifactStatus required, ArtifactStatus next, DateTimeOffset now)
    {
        if (Status != required) throw new InvalidOperationException($"Artifact must be {required} before becoming {next}.");
        Status = next;
        Version++;
        UpdatedAt = now;
    }
}

public sealed class AiTaskDraftArtifact : IArtifactDetail
{
    private AiTaskDraftArtifact() { }
    public Guid ArtifactId { get; private set; }
    public TaskDraftKind Kind { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateTimeOffset StartTimeUtc { get; private set; }
    public DateTimeOffset EndTimeUtc { get; private set; }
    public string TimeZoneId { get; private set; } = string.Empty;
    public DateOnly StartDateLocal { get; private set; }
    public DateOnly EndDateLocal { get; private set; }
    public int? LabelId { get; private set; }
}

public sealed class AiConversationEffect
{
    private AiConversationEffect() { }
    public Guid Id { get; private set; }
    public Guid ConversationId { get; private set; }
    public int BaseConversationVersion { get; private set; }
    public string Type { get; private set; } = string.Empty;
    public int SchemaVersion { get; private set; }
    public ConversationEffectStatus Status { get; private set; }
    public string IdempotencyKey { get; private set; } = string.Empty;
    public int AttemptCount { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset? LeaseExpiresAt { get; private set; }
    public string? LastErrorCode { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public byte[] RowVersion { get; private set; } = [];
    public AiConversation? Conversation { get; private set; }

    public static AiConversationEffect Create(
        Guid conversationId, int baseVersion, string type, int schemaVersion,
        string idempotencyKey, DateTimeOffset now) => new()
        {
            Id = Guid.NewGuid(), ConversationId = conversationId, BaseConversationVersion = baseVersion,
            Type = type, SchemaVersion = schemaVersion, Status = ConversationEffectStatus.Pending,
            IdempotencyKey = idempotencyKey, CreatedAt = now, UpdatedAt = now
        };

    public void AcquireLease(DateTimeOffset leaseExpiresAt, DateTimeOffset now)
    {
        var canAcquire = Status == ConversationEffectStatus.Pending
            || Status == ConversationEffectStatus.Running && LeaseExpiresAt <= now;
        if (!canAcquire)
            throw new InvalidOperationException("Only a pending effect or an effect with an expired lease can run.");
        if (leaseExpiresAt <= now)
            throw new ArgumentOutOfRangeException(nameof(leaseExpiresAt), "The effect lease must expire in the future.");

        Status = ConversationEffectStatus.Running;
        AttemptCount++;
        StartedAt ??= now;
        LeaseExpiresAt = leaseExpiresAt;
        LastErrorCode = null;
        UpdatedAt = now;
    }

    public void Complete(DateTimeOffset now)
    {
        EnsureRunning();
        Status = ConversationEffectStatus.Completed;
        CompletedAt = now;
        LeaseExpiresAt = null;
        LastErrorCode = null;
        UpdatedAt = now;
    }

    public void Fail(string errorCode, DateTimeOffset now)
    {
        EnsureRunning();
        if (string.IsNullOrWhiteSpace(errorCode))
            throw new ArgumentException("An effect error code is required.", nameof(errorCode));

        Status = ConversationEffectStatus.Failed;
        CompletedAt = now;
        LeaseExpiresAt = null;
        LastErrorCode = errorCode;
        UpdatedAt = now;
    }

    public void Supersede(DateTimeOffset now)
    {
        if (Status is ConversationEffectStatus.Completed
            or ConversationEffectStatus.Failed
            or ConversationEffectStatus.Superseded)
            return;
        Status = ConversationEffectStatus.Superseded;
        CompletedAt = now;
        LeaseExpiresAt = null;
        UpdatedAt = now;
    }

    private void EnsureRunning()
    {
        if (Status != ConversationEffectStatus.Running)
            throw new InvalidOperationException("Only a running effect can be completed or failed.");
    }
}
