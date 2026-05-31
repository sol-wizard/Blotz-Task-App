using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Modules.Badges.Services;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEventHandler(
    BlotzTaskDbContext db,
    FindMatchingBadgesHandler findMatchingBadgesHandler,
    AwardNewBadgesToUserHandler awardNewBadgesToUserHandler,
    NotifyBadgesToUser notifyBadgesToUser,
    ILogger<TaskCompletedEventHandler> logger)
    : IDomainEventHandler<TaskCompletedEvent>
{
    public async Task HandleAsync(TaskCompletedEvent taskCompletedEvent, CancellationToken ct = default)
    {
        logger.LogInformation("[TaskCompletedEventHandler] Started — TaskId {TaskId}", taskCompletedEvent.TaskId);

        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == taskCompletedEvent.TaskId, ct);

        int completeOffsetMinutes = 0;
        if (task != null)
            completeOffsetMinutes = (int)(DateTimeOffset.UtcNow - task.EndTime).TotalMinutes;
        

        // TODO: You can consider merging these three functions into one, so we won't need to use all three repetitively in every badge event handler.
        var matchingBadgeIds = await findMatchingBadgesHandler.Handle(new FindMatchingBadgesCommand
        {
            TriggerAction = TriggerAction.TaskComplete,
            EventValues = new Dictionary<EventValueKey, double>
            {
                [EventValueKey.CompleteOffsetMins] = completeOffsetMinutes
            }
        }, ct);

        var awardedBadgeIds = await awardNewBadgesToUserHandler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = taskCompletedEvent.UserId,
            BadgeIds = matchingBadgeIds
        }, ct);


        await notifyBadgesToUser.HandleAsync(taskCompletedEvent.UserId, awardedBadgeIds, ct);
    }
}
