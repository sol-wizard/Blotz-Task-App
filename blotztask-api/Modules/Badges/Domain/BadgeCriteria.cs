using BlotzTask.Modules.Badges.Enum;

namespace BlotzTask.Modules.Badges.Domain;

public class BadgeCriteria
{
    public int Id { get; set; }
    public int BadgeId { get; set; }
    public TriggerAction TriggerAction { get; set; }
    public required EventValueKey ConditionKey { get; set; }
    public required string ConditionOperator { get; set; }
    public double ConditionValue { get; set; }

    public Badge Badge { get; set; } = null!;
}
