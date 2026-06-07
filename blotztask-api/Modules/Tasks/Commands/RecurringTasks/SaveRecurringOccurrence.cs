using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class SaveRecurringOccurrenceRequest
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
}

public class SaveRecurringOccurrenceCommand
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
    public required Guid UserId { get; init; }
}

public class SaveRecurringOccurrenceCommandHandler(
    BlotzTaskDbContext db,
    RecurringOccurrenceMaterializer materializer,
    ILogger<SaveRecurringOccurrenceCommandHandler> logger)
{
    public async Task<int> Handle(SaveRecurringOccurrenceCommand command, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
            command.RecurringTaskId,
            command.OccurrenceDate,
            command.UserId,
            ct);

        taskItem.IsDone = true;
        taskItem.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "Completed occurrence for RecurringTask {RecurringTaskId} on {Date} as TaskItem {TaskItemId}",
            command.RecurringTaskId, command.OccurrenceDate, taskItem.Id);

        return taskItem.Id;
    }
}
