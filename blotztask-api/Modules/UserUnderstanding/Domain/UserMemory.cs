namespace BlotzTask.Modules.UserUnderstanding.Domain;

public enum UserMemoryKind { Preference, Goal, Constraint, Routine, Fact }

public enum UserMemoryScope { All, Planning, Chat }

public enum UserMemorySource { Explicit, Extracted, ConfirmedObservation }

public enum UserMemoryStatus { Active, Superseded, Deleted }

/// <summary>
/// One thing the AI knows about the user, with where it came from and how long it applies.
/// A deleted memory keeps only its content hash, so later extraction can recognise and skip it.
/// </summary>
public class UserMemory
{
    public const int MaxContentLength = 100;
    public const int MaxEvidenceLength = 200;
    public const int MaxActivePerUser = 30;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public UserMemoryKind Kind { get; set; }
    public UserMemoryScope Scope { get; set; } = UserMemoryScope.All;
    /// <summary>Empty once the memory is deleted.</summary>
    public string Content { get; set; } = string.Empty;
    /// <summary>SHA-256 of the normalised content, kept after deletion.</summary>
    public string ContentHash { get; set; } = string.Empty;
    public UserMemorySource Source { get; set; }
    public Guid? SourceMessageId { get; set; }
    /// <summary>What the user said, kept so the memory can be explained after the message expires.</summary>
    public string? EvidenceExcerpt { get; set; }
    public UserMemoryStatus Status { get; set; } = UserMemoryStatus.Active;
    public Guid? SupersededById { get; set; }
    public DateTimeOffset? ValidUntil { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset LastConfirmedAt { get; set; }

    /// <summary>Short reference the model uses to name a memory, e.g. in forget.</summary>
    public string Ref => Id.ToString("N")[..6];

    /// <summary>A memory that applies "through" a local date stops at the start of the next local day.</summary>
    public static DateTimeOffset EndOfLocalDay(DateOnly lastDay, string timeZoneId)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        var nextDay = lastDay.AddDays(1).ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(nextDay, zone.GetUtcOffset(nextDay));
    }

    public bool IsInEffect(DateTimeOffset now) =>
        Status == UserMemoryStatus.Active && (ValidUntil is null || ValidUntil > now);
}
