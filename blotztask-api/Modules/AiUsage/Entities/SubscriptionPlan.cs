namespace BlotzTask.Modules.AiUsage.Entities;

public class SubscriptionPlan
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int MonthlyTokenLimit { get; set; }
}
