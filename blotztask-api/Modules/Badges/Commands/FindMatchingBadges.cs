using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Enum;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class FindMatchingBadgesCommand
{
    public required TriggerAction TriggerAction { get; init; }
    public required Dictionary<string, double> EventValues { get; init; }
}

public class FindMatchingBadgesHandler(BlotzTaskDbContext db, ILogger<FindMatchingBadgesHandler> logger)
{
    public async Task<List<int>> Handle(FindMatchingBadgesCommand command, CancellationToken ct = default)
    {
        var criteria = await db.BadgeCriteria
            .Where(c => c.TriggerAction == command.TriggerAction)
            .ToListAsync(ct);
            

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


