using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Modules.Badges.Services;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEventHandler(
    BlotzTaskDbContext db,
    BadgeAwardService badgeAwardService,
    ILogger<TaskCompletedEventHandler> logger)
    : IDomainEventHandler<TaskCompletedEvent>
{
    public async Task HandleAsync(TaskCompletedEvent taskCompletedEvent, CancellationToken ct = default)
    {
        logger.LogInformation("[TaskCompletedEventHandler] Started — TaskId {TaskId}", taskCompletedEvent.TaskId);

        if (Random.Shared.NextDouble() >= 0.5)
        {
            logger.LogInformation("[TaskCompletedEventHandler] Skipped badge award (50% chance) — TaskId {TaskId}", taskCompletedEvent.TaskId);
            return;
        }

        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == taskCompletedEvent.TaskId, ct);

        int completeOffsetMinutes = 0;
        if (task?.CompletedAt != null)
            completeOffsetMinutes = (int)(task.CompletedAt.Value - task.EndTime).TotalMinutes;

        await badgeAwardService.ProcessAsync(new BadgeAwardCommand
        {
            UserId = taskCompletedEvent.UserId,
            TriggerAction = TriggerAction.TaskComplete,
            EventValues = new Dictionary<EventValueKey, double>
            {
                [EventValueKey.CompleteOffsetMins] = completeOffsetMinutes
            }
        }, ct);
    }
}
