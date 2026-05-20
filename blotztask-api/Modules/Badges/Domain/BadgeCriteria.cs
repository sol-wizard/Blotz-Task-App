namespace BlotzTask.Modules.Badges.Domain;

public class BadgeCriteria
{
    public int Id { get; set; }
    public int BadgeId { get; set; }
    public required string TriggerAction { get; set; }
    public required string ConditionKey { get; set; }
    public required string ConditionOperator { get; set; }
    public double ConditionValue { get; set; }

    public Badge Badge { get; set; } = null!;
}
