using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEventHandler(
    BlotzTaskDbContext db,
    FindMatchingBadgesHandler findMatchingBadgesHandler,
    AwardNewBadgesToUserHandler awardNewBadgesToUserHandler,
    ILogger<TaskCompletedEventHandler> logger)
    : IDomainEventHandler<TaskCompletedEvent>
{
    public async Task HandleAsync(TaskCompletedEvent domainEvent, CancellationToken ct = default)
    {
        logger.LogInformation("[TaskCompletedEventHandler] Started — TaskId {TaskId}", domainEvent.TaskId);

        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == domainEvent.TaskId, ct);

        int completeOffsetMinutes = 0;
        if (task != null)
            completeOffsetMinutes = (int)(DateTimeOffset.UtcNow - task.EndTime).TotalMinutes;

        logger.LogInformation("[TaskCompletedEventHandler] completeOffsetMinutes={Minutes}", completeOffsetMinutes);

        var matchingBadgeIds = await findMatchingBadgesHandler.Handle(new FindMatchingBadgesCommand
        {
            TriggerAction = TriggerAction.TaskComplete,
            EventValues = new Dictionary<string, double>
            {
                ["complete_offset_mins"] = completeOffsetMinutes
            }
        }, ct);

        logger.LogInformation("[TaskCompletedEventHandler] FindMatchingBadges returned {Count} badge(s)", matchingBadgeIds.Count);

        await awardNewBadgesToUserHandler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = domainEvent.UserId,
            BadgeIds = matchingBadgeIds
        }, ct);

        logger.LogInformation("[TaskCompletedEventHandler] Completed — TaskId {TaskId}", domainEvent.TaskId);
    }
}
