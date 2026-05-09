using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.AiUsage.Entities;

public class UserSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public int PlanId { get; set; }
    public DateTime CreatedAt { get; set; }

    public AppUser User { get; set; } = null!;
    public SubscriptionPlan Plan { get; set; } = null!;
}
