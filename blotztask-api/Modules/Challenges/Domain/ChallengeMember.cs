namespace BlotzTask.Modules.Challenges.Domain;

public class ChallengeMember
{
    public required Guid ChallengeId { get; set; }
    public required Guid MemberId { get; set; }
}