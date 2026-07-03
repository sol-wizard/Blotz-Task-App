namespace BlotzTask.Modules.Badges.Domain;

public class UserBadge
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int BadgeId { get; set; }
    public DateTimeOffset EarnedAtUtc { get; set; }
}
