using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEventHandler(
    BlotzTaskDbContext db,
    EvaluateBadgeCriteriaHandler evaluateBadgeCriteriaHandler)
    : IDomainEventHandler<TaskCompletedEvent>
{
    public async Task HandleAsync(TaskCompletedEvent domainEvent, CancellationToken ct = default)
    {
        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == domainEvent.TaskId, ct);

        int completeOffsetMinutes = 0;

        if (task != null)
            completeOffsetMinutes = (int)(task.EndTime - DateTimeOffset.UtcNow).TotalMinutes;

        var matchingBadgeIds = await evaluateBadgeCriteriaHandler.Handle(new EvaluateBadgeCriteriaCommand
        {
            TriggerAction = domainEvent.TriggerAction,
            EventValues = new Dictionary<string, double>
            {
                ["complete_offset_mins"] = completeOffsetMinutes
            }
        }, ct);
    }
}
