using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Enum;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class FindMatchingBadgesCommand
{
    public required TriggerAction TriggerAction { get; init; }
    public required Dictionary<EventValueKey, double> EventValues { get; init; }
}


public class FindMatchingBadgesHandler(BlotzTaskDbContext db, ILogger<FindMatchingBadgesHandler> logger)
{
    public async Task<List<int>> Handle(FindMatchingBadgesCommand command, CancellationToken ct = default)
    {
        var criteria = await db.BadgeCriteria
            .Where(c => c.TriggerAction == command.TriggerAction)
            .ToListAsync(ct);
            

        // A badge matches only if every one of its criteria passes — partial matches are excluded.
        // 1. Group criteria by BadgeId so we can evaluate all criteria for a badge together.
        // 2. For each criterion, look up the event value by ConditionKey from the incoming event data.
        // 3. Pass the actual value, operator, and expected value to EvaluateCondition to check if the criterion is met.
        var matchingBadgeIds = criteria
            .GroupBy(c => c.BadgeId)
            .Where(group => group.All(c =>
                command.EventValues.TryGetValue(c.ConditionKey, out var actualValue)
                && EvaluateCondition(actualValue, c.ConditionOperator, c.ConditionValue)
            ))
            .Select(group => group.Key)
            .ToList();

        logger.LogInformation(
            "EvaluateBadgeCriteria: trigger={TriggerAction}, matched {Count} badge(s)",
            command.TriggerAction, matchingBadgeIds.Count);

        return matchingBadgeIds;
    }
    private static bool EvaluateCondition(double actual, string op, double expected) =>
        op switch
        {
            ">=" => actual >= expected,
            ">"  => actual >  expected,
            "<=" => actual <= expected,
            "<"  => actual <  expected,
            "==" => actual == expected,
            "!=" => actual != expected,
            _    => false
        };
}


