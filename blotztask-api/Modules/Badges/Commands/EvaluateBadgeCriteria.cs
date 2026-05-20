using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class EvaluateBadgeCriteriaCommand
{
    public required string TriggerAction { get; init; }
    public required Dictionary<string, double> EventValues { get; init; }
}

public class EvaluateBadgeCriteriaHandler(BlotzTaskDbContext db, ILogger<EvaluateBadgeCriteriaHandler> logger)
{
    public async Task<List<int>> Handle(EvaluateBadgeCriteriaCommand command, CancellationToken ct = default)
    {
        var criteria = await db.BadgeCriteria
            .Where(c => c.TriggerAction == command.TriggerAction)
            .ToListAsync(ct);

        if (criteria.Count == 0)
            return [];

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


