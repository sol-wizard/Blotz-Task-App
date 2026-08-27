using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// The conversation aggregate held by <c>IConversationStore</c>. For v1 this lives in memory
/// only (approved: IMemoryCache store; swapping to a database later replaces the store
/// implementation, not this type).
///
/// All writes go through <see cref="ApplyTransition"/> so that every change is the result of a
/// Kernel-approved <see cref="StateTransition"/>. The Application layer serializes access per
/// conversation.
/// </summary>
public sealed class Conversation
{
    public required Guid Id { get; init; }
    public required Guid UserId { get; init; }
    public required AiCoachMode Mode { get; init; }
    public required string TimeZoneId { get; init; }

    /// <summary>Pinned at creation (v3 §6): never silently switched on deploy.</summary>
    public required ConversationRuntimeVersions RuntimeVersions { get; init; }

    public ConversationPhase Phase { get; private set; } = ConversationPhase.Conversing;
    public GenerationStatus GenerationStatus { get; private set; } = GenerationStatus.Idle;
    public BlockedReason BlockedReason { get; private set; } = BlockedReason.None;
    public int Version { get; private set; }
    public OpenQuestionSnapshot? OpenQuestion { get; private set; }
    public ActivePlanningIntentSnapshot? ActivePlanningIntent { get; private set; }
    public ProposalSet? CurrentProposalSet { get; private set; }

    private readonly HashSet<ConversationFact> _facts = [];
    public IReadOnlySet<ConversationFact> Facts => _facts;

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

    /// <summary>Recent-turn window; v1 has no summary compression (v3 §22 batch high-water is future).</summary>
    public const int RecentTurnLimit = 20;

    public ConversationSnapshot ToSnapshot() => new(
        Id,
        UserId,
        Mode,
        Phase,
        GenerationStatus,
        BlockedReason,
        Version,
        CurrentProposalSet?.ToSnapshot(),
        OpenQuestion,
        new HashSet<ConversationFact>(_facts),
        AllowedActions,
        RuntimeVersions,
        ActivePlanningIntent);

    public TrackedEffect? FindEffect(Guid effectId) => _effects.FirstOrDefault(e => e.Id == effectId);

    public bool HasActiveGenerationEffect() =>
        _effects.Any(e => e.Request is GenerateModelTurnEffectRequest
                          && e.Status is EffectStatus.Pending or EffectStatus.Running);

    /// <summary>
    /// Applies an accepted transition: mutations, facts, phase dimensions, allowed actions, and
    /// the version bump. Requested effects are materialized into tracked effects (with lease and
    /// idempotency key) and returned so the Application layer can run them after Transaction A
    /// commits (v3 §7.1-§7.3).
    /// </summary>
    public IReadOnlyList<TrackedEffect> ApplyTransition(
        StateTransition transition,
        DateTimeOffset now,
        TimeSpan effectLeaseDuration)
    {
        if (!transition.IsAccepted)
            throw new InvalidOperationException("Only accepted transitions can be applied.");

        foreach (var mutation in transition.Mutations)
            Apply(mutation, now);

        foreach (var fact in transition.RemoveFacts)
            _facts.Remove(fact);
        foreach (var fact in transition.AddFacts)
            _facts.Add(fact);

        Phase = transition.NextPhase;
        GenerationStatus = transition.NextGenerationStatus;
        BlockedReason = transition.NextBlockedReason;
        AllowedActions = transition.AllowedActions;
        Version++;
        UpdatedAt = now;

        var materialized = new List<TrackedEffect>();
        foreach (var request in transition.Effects)
        {
            var effect = new TrackedEffect
            {
                Id = Guid.NewGuid(),
                Request = request,
                BaseConversationVersion = Version,
                IdempotencyKey = request switch
                {
                    PersistProposalSetEffectRequest persist => $"confirm-proposal-set:{persist.ProposalSetId}",
                    GenerateModelTurnEffectRequest turn => $"model-turn:{turn.TriggeringMessageId}",
                    _ => Guid.NewGuid().ToString("N"),
                },
                CreatedAt = now,
                LeaseExpiresAt = now + effectLeaseDuration,
            };

            // Idempotency guard (v3 §7.4): the same key must not spawn a second effect.
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

            case CreateProposalSetMutation m:
                // Domain invariant (v3 §13.8): at most one open Current ProposalSet; the current
                // set must reach a terminal state before a new one is created.
                if (CurrentProposalSet is { IsOpen: true })
                    throw new InvalidOperationException("An open proposal set already exists for this conversation.");
                CurrentProposalSet = new ProposalSet
                {
                    Id = Guid.NewGuid(),
                    Proposals = m.Proposals,
                    CreatedAt = now,
                };
                break;

            case UpdateProposalSetStatusMutation m:
                RequireCurrentSet(m.ProposalSetId).SetStatus(m.Status, now);
                break;

            case ReplaceProposalsMutation m:
                RequireCurrentSet(m.ProposalSetId).ReplaceProposals(m.Proposals, now);
                break;

            case RecordPersistedTaskMutation m:
                RequireCurrentSet(m.ProposalSetId).RecordPersistedTask(m.ProposalId, m.PersistedTaskId, now);
                break;

            case ClearCurrentProposalSetMutation m:
                RequireCurrentSet(m.ProposalSetId);
                CurrentProposalSet = null;
                break;

            case SetOpenQuestionMutation m:
                var previousAttempts = OpenQuestion is { } current
                                       && current.PlanningIntentId == m.PlanningIntentId
                                       && current.Topic == m.Topic
                    ? current.RoundsAsked
                    : 0;
                OpenQuestion = new OpenQuestionSnapshot(
                    m.Question,
                    previousAttempts + 1,
                    m.PlanningIntentId,
                    m.Topic,
                    ClarificationResolution.AwaitingAnswer);
                break;

            case UpsertPlanningIntentMutation m:
                ActivePlanningIntent = m.Intent;
                break;

            case RecordClarificationAttemptMutation m when ActivePlanningIntent?.IntentId == m.IntentId:
                ActivePlanningIntent = ActivePlanningIntent with
                {
                    AskedTopics = new HashSet<ClarificationTopic>(
                        (ActivePlanningIntent.AskedTopics ?? new HashSet<ClarificationTopic>())
                        .Append(m.Topic)),
                    Status = PlanningIntentStatus.Collecting,
                };
                break;

            case UpdatePlanningIntentStatusMutation m when ActivePlanningIntent?.IntentId == m.IntentId:
                ActivePlanningIntent = ActivePlanningIntent with { Status = m.Status };
                break;

            case ResolveOpenQuestionMutation m when OpenQuestion is not null:
                OpenQuestion = OpenQuestion with { Resolution = m.Resolution };
                break;

            case ClearOpenQuestionMutation:
                OpenQuestion = null;
                break;

            default:
                throw new InvalidOperationException($"Unsupported mutation {mutation.GetType().Name}.");
        }
    }

    private ProposalSet RequireCurrentSet(Guid proposalSetId)
    {
        if (CurrentProposalSet is null || CurrentProposalSet.Id != proposalSetId)
            throw new InvalidOperationException("Mutation targets a proposal set that is not current.");
        return CurrentProposalSet;
    }

    private void AppendMessage(ConversationMessage message)
    {
        _messages.Add(message);
        // Keep only the recent-turn window (no summary compression in v1).
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

/// <summary>
/// In-memory stand-in for the persisted Effect run record (v3 §7.4). v1 executes effects
/// in-process (single attempt, no recovery worker), but the record keeps the full lease shape
/// so a database-backed worker can slot in without changing the Kernel or Application flow.
/// </summary>
public sealed class TrackedEffect
{
    public required Guid Id { get; init; }
    public required ConversationEffectRequest Request { get; init; }
    public required int BaseConversationVersion { get; init; }
    public required string IdempotencyKey { get; init; }
    public EffectStatus Status { get; private set; } = EffectStatus.Pending;
    public int AttemptCount { get; private set; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset LeaseExpiresAt { get; init; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? LastErrorCode { get; private set; }

    public void MarkRunning()
    {
        Status = EffectStatus.Running;
        AttemptCount++;
    }

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

/// <summary>In-memory stand-in for the Command Receipt table (v3 §18.1): replay-safe user commands.</summary>
public sealed record CommandReceipt(
    Guid CommandId,
    Guid ProposalSetId,
    string CommandType,
    string RequestHash,
    CommandReceiptStatus Status,
    object? Result);
