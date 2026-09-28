namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

public sealed record ScheduleConflict(Guid ItemId, string TaskIdentity, string TaskTitle,
    DateTimeOffset Start, DateTimeOffset End);

public sealed record ScheduleAssessment(string Status, DateTimeOffset CheckedAt,
    IReadOnlyList<ScheduleConflict> Conflicts, string? ConflictToken = null,
    string Scope = "scheduled");
