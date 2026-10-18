using BlotzTask.Modules.Challenges.Enums;

namespace BlotzTask.Modules.Challenges.Domain;

public class Challenge
{
    public required Guid Id { get; set; }
    public Guid CreatorUserId { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public required int PeriodDays { get; set; }

    public required string Name { get; set; }

    public required ChallengeStatus Status { get; set; }
    public required DateTimeOffset CreatedAt { get; set; }
}