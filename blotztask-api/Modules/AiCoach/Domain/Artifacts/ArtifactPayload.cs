namespace BlotzTask.Modules.AiCoach.Domain.Artifacts;

/// <summary>
/// Strongly-typed artifact payloads (tech design §21.4). No untyped JSON payloads inside
/// the backend. Date/StartTime/EndTime plus TimeZoneId form the local-time contract with
/// the client; the server resolves them to <see cref="DateTimeOffset"/> during validation.
/// </summary>
public abstract record ArtifactPayload;

/// <summary>
/// One task inside a draft card. <see cref="PersistedTaskId"/> is set per item as the formal
/// task is created, so a partially-persisted batch is representable without inventing a new
/// artifact status (product decision 2026-08-22: one card, many tasks; partial-failure policy
/// is error handling and may change without touching this shape).
/// </summary>
public sealed record TaskDraftItem(
    Guid ItemId,
    string Title,
    string? Description,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string TimeZoneId,
    int? LabelId,
    int? PersistedTaskId = null);

/// <summary>
/// The Task Draft card: 1..<see cref="MaxItems"/> one-off tasks proposed in a single turn.
/// "User says N things → N tasks" (Ben, 2026-08-22); the single-current-artifact invariant
/// (§21.5) is kept by putting them on ONE card rather than N cards.
/// </summary>
public sealed record TaskDraftPayload(IReadOnlyList<TaskDraftItem> Items) : ArtifactPayload
{
    public const int MaxItems = 10;

    public bool IsSingle => Items.Count == 1;

    public bool AllPersisted => Items.All(i => i.PersistedTaskId.HasValue);

    public TaskDraftPayload WithPersistedTask(Guid itemId, int taskId) => new(
        Items.Select(i => i.ItemId == itemId ? i with { PersistedTaskId = taskId } : i).ToList());
}
