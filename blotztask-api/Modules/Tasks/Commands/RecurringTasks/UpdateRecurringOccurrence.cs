using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Services;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class UpdateRecurringOccurrenceRequest
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
    public required EditTaskItemDto TaskDetails { get; init; }
}

public class UpdateRecurringOccurrenceCommand
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
    public required EditTaskItemDto TaskDetails { get; init; }
    public required Guid UserId { get; init; }
}

public class UpdateRecurringOccurrenceCommandHandler(
    BlotzTaskDbContext db,
    RecurringOccurrenceMaterializer materializer,
    TaskItemUpdater taskItemUpdater,
    ILogger<UpdateRecurringOccurrenceCommandHandler> logger)
{
    public async Task<int> Handle(UpdateRecurringOccurrenceCommand command, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
            command.RecurringTaskId,
            command.OccurrenceDate,
            command.UserId,
            ct);

        await db.Entry(taskItem).Reference(t => t.Deadline).LoadAsync(ct);
        taskItemUpdater.Apply(taskItem, command.TaskDetails);
        db.TaskItems.Update(taskItem);

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "Updated occurrence for RecurringTask {RecurringTaskId} on {Date} as TaskItem {TaskItemId}",
            command.RecurringTaskId, command.OccurrenceDate, taskItem.Id);

        return taskItem.Id;
    }
}
