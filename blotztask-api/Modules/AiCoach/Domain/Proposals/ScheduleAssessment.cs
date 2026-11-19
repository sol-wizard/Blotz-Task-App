namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

public sealed record ScheduleConflict(Guid ItemId, string TaskIdentity, string TaskTitle,
    DateTimeOffset Start, DateTimeOffset End);

/// <param name="Reason">Why the check is "unverified": "too_many_dates" when retrying cannot help, null for a failed read.</param>
public sealed record ScheduleAssessment(string Status, DateTimeOffset CheckedAt,
    IReadOnlyList<ScheduleConflict> Conflicts, string? ConflictToken = null,
    string Scope = "scheduled", string? Reason = null);
