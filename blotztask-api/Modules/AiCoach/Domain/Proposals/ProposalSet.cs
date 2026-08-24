namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

/// <summary>
/// ProposalSet lifecycle (v3 tech design §6). The set — not the single proposal — is the unit
/// the client confirms or rejects; per-proposal outcomes are tracked through
/// <see cref="TaskProposal.PersistedTaskId"/>.
/// </summary>
public enum ProposalSetStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Rejected = 3,
    Superseded = 4,
    Expired = 5,
    PartiallyFailed = 6,
}

public static class ProposalSetStatusExtensions
{
    /// <summary>
    /// Protocol-2 artifact status string. <see cref="ProposalSetStatus.PartiallyFailed"/>
    /// deliberately renders as "pending": the schema-2 client models a partially failed card as
    /// a pending card whose already-saved rows carry <c>persistedTaskId</c> and are locked.
    /// </summary>
    public static string ToWireValue(this ProposalSetStatus status) => status switch
    {
        ProposalSetStatus.Pending => "pending",
        ProposalSetStatus.Processing => "processing",
        ProposalSetStatus.Completed => "accepted",
        ProposalSetStatus.Rejected => "rejected",
        ProposalSetStatus.Superseded => "superseded",
        ProposalSetStatus.Expired => "expired",
        ProposalSetStatus.PartiallyFailed => "pending",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unmapped proposal set status"),
    };
}

/// <summary>
/// One proposed task inside a ProposalSet. Date/StartTime/EndTime plus TimeZoneId form the
/// local-time contract with the client; the server resolves them to instants at confirm time.
/// <see cref="PersistedTaskId"/> is set per proposal as the formal task is created, so a
/// partially persisted set is representable without extra statuses.
/// </summary>
public sealed record TaskProposal(
    Guid ProposalId,
    string Title,
    string? Description,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string TimeZoneId,
    int? LabelId,
    int? PersistedTaskId = null);

/// <summary>
/// The current ProposalSet of a conversation (v3 tech design §11). Server-owned identity and
/// lifecycle: the model only ever supplies candidate payload fields, never Id / Version /
/// Status / PersistedTaskId (§11 "模型不能设置" list).
///
/// Projected to the schema-2 <c>task_draft</c> artifact envelope for the unchanged mobile
/// client: one set = one card, one proposal = one row.
/// </summary>
public sealed class ProposalSet
{
    /// <summary>Schema 2: the card payload is a list of items (schema 1 was a single task).</summary>
    public const int SchemaVersion = 2;

    /// <summary>"User says N things → N tasks" (Ben, 2026-08-22) with a hard ceiling of 10.</summary>
    public const int MaxProposals = 10;

    public required Guid Id { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public ProposalSetStatus Status { get; private set; } = ProposalSetStatus.Pending;
    public int Version { get; private set; } = 1;
    public DateTimeOffset UpdatedAt { get; private set; }

    private List<TaskProposal> _proposals = [];
    public IReadOnlyList<TaskProposal> Proposals
    {
        get => _proposals;
        init => _proposals = [.. value];
    }

    public bool IsSingle => _proposals.Count == 1;

    public bool AllPersisted => _proposals.All(p => p.PersistedTaskId.HasValue);

    public bool IsOpen => Status is ProposalSetStatus.Pending
        or ProposalSetStatus.Processing
        or ProposalSetStatus.PartiallyFailed;

    public ProposalSetSnapshot ToSnapshot() =>
        new(Id, SchemaVersion, Status, Version, Proposals);

    internal void SetStatus(ProposalSetStatus status, DateTimeOffset now)
    {
        // Terminal sets never change again; the single allowed recovery is
        // Processing -> PartiallyFailed after a failed persistence attempt.
        if (Status is ProposalSetStatus.Completed or ProposalSetStatus.Rejected
            or ProposalSetStatus.Superseded or ProposalSetStatus.Expired)
            throw new InvalidOperationException($"ProposalSet in terminal state {Status} cannot transition to {status}.");
        Status = status;
        Version++;
        UpdatedAt = now;
    }

    internal void ReplaceProposals(IReadOnlyList<TaskProposal> proposals, DateTimeOffset now)
    {
        if (!IsOpen)
            throw new InvalidOperationException("Only open proposal sets can be edited.");
        _proposals = [.. proposals];
        Version++;
        UpdatedAt = now;
    }

    /// <summary>
    /// Records a created formal task on one proposal. Allowed while Processing (normal flow);
    /// does not bump the version because it is not a user-visible edit.
    /// </summary>
    internal void RecordPersistedTask(Guid proposalId, int taskId, DateTimeOffset now)
    {
        var index = _proposals.FindIndex(p => p.ProposalId == proposalId);
        if (index < 0)
            throw new InvalidOperationException("Persisted task targets a proposal that is not on the set.");
        _proposals[index] = _proposals[index] with { PersistedTaskId = taskId };
        UpdatedAt = now;
    }
}

/// <summary>Read-only view of the current ProposalSet inside a snapshot.</summary>
public sealed record ProposalSetSnapshot(
    Guid Id,
    int SchemaVersion,
    ProposalSetStatus Status,
    int Version,
    IReadOnlyList<TaskProposal> Proposals)
{
    public bool IsSingle => Proposals.Count == 1;

    public bool IsOpen => Status is ProposalSetStatus.Pending
        or ProposalSetStatus.Processing
        or ProposalSetStatus.PartiallyFailed;
}
