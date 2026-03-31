namespace BlotzTask.Modules.Badges.Domain;

public class UserBadge
{
    public Guid UserId { get; set; }
    public int BadgeId { get; set; }
    public DateTime EarnedAtUtc { get; set; }
}
