using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Enum;
using BlotzTask.Shared.Events;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEventHandler(
    BlotzTaskDbContext db,
    CheckAndAwardBadgesCommandHandler checkAndAwardBadgesCommandHandler)
    : IDomainEventHandler<TaskCompletedEvent>
{
    public async Task HandleAsync(TaskCompletedEvent domainEvent, CancellationToken ct = default)
    {
        var completedCount = await db.TaskItems.CountAsync(t => t.UserId == domainEvent.UserId && t.IsDone, ct);

        await checkAndAwardBadgesCommandHandler.Handle(new CheckAndAwardBadgesCommand
        {
            UserId = domainEvent.UserId,
            Category = BadgeCategory.TaskCompletion,
            CurrentValue = completedCount
        }, ct);
    }
}
