using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEventHandler(
    BlotzTaskDbContext db,
    EvaluateBadgeCriteriaHandler evaluateBadgeCriteriaHandler,
    AwardNewBadgesToUserHandler awardNewBadgesToUserHandler)
    : IDomainEventHandler<TaskCompletedEvent>
{
    public async Task HandleAsync(TaskCompletedEvent domainEvent, CancellationToken ct = default)
    {
        Console.WriteLine("🔔TaskCompletedEvent is triggered");
        var task = await db.TaskItems
            .FirstOrDefaultAsync(t => t.Id == domainEvent.TaskId, ct);

        int completeOffsetMinutes = 0;

        if (task != null)
        {
            completeOffsetMinutes = (int)( DateTimeOffset.UtcNow - task.EndTime).TotalMinutes;
        }

        Console.WriteLine($"task completeOffsetMinutes is: {completeOffsetMinutes}");
            
        
        Console.WriteLine("🔔evaluateBadgeCriteriaHandler is triggered");

        var matchingBadgeIds = await evaluateBadgeCriteriaHandler.Handle(new EvaluateBadgeCriteriaCommand
        {
            TriggerAction = domainEvent.TriggerAction,
            EventValues = new Dictionary<string, double>
            {
                ["complete_offset_mins"] = completeOffsetMinutes
            }
        }, ct);

        Console.WriteLine("🔔evaluateBadgeCriteriaHandler is finished");

        await awardNewBadgesToUserHandler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = domainEvent.UserId,
            BadgeIds = matchingBadgeIds
        }, ct);
        
        Console.WriteLine("🔔awardNewBadgesToUserHandler is finished");
    }
}
