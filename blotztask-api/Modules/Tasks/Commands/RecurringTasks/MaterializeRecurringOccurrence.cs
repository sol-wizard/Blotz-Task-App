using BlotzTask.Modules.Tasks.Domain.Services;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class MaterializeRecurringOccurrenceRequest
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
}

public class MaterializeRecurringOccurrenceCommand
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
    public required Guid UserId { get; init; }
}

public class MaterializeRecurringOccurrenceCommandHandler(
    RecurringOccurrenceMaterializer materializer,
    ILogger<MaterializeRecurringOccurrenceCommandHandler> logger)
{
    public async Task<int> Handle(MaterializeRecurringOccurrenceCommand command, CancellationToken ct)
    {
        var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
            command.RecurringTaskId,
            command.OccurrenceDate,
            command.UserId,
            ct);

        logger.LogInformation(
            "Materialized occurrence for RecurringTask {RecurringTaskId} on {Date} as TaskItem {TaskItemId}",
            command.RecurringTaskId, command.OccurrenceDate, taskItem.Id);

        return taskItem.Id;
    }
}
