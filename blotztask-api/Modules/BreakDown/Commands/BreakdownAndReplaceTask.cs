using System.Text.Json.Serialization;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Services;

namespace BlotzTask.Modules.BreakDown.Commands;

public class BreakdownAndReplaceTaskRequest
{
    public int? TaskId { get; init; }
    public int? RecurringTaskId { get; init; }
    public DateOnly? OccurrenceDate { get; init; }
}

public class BreakdownAndReplaceTaskCommand
{
    public int? TaskId { get; init; }
    public int? RecurringTaskId { get; init; }
    public DateOnly? OccurrenceDate { get; init; }
    public required Guid UserId { get; init; }
}

public class BreakdownAndReplaceTaskResult : BreakdownResult
{
    [JsonPropertyName("taskItemId")] public int TaskItemId { get; init; }
}

public class BreakdownAndReplaceTaskCommandHandler(
    BreakdownTargetResolver targetResolver,
    BreakdownTaskCommandHandler breakdownTaskCommandHandler,
    ReplaceSubtasksCommandHandler replaceSubtasksCommandHandler,
    ILogger<BreakdownAndReplaceTaskCommandHandler> logger)
{
    public async Task<BreakdownAndReplaceTaskResult> Handle(
        BreakdownAndReplaceTaskCommand command,
        CancellationToken ct = default)
    {
        var taskItemId = await targetResolver.ResolveTaskItemId(
            command.TaskId, command.RecurringTaskId, command.OccurrenceDate, command.UserId, ct);

        var breakdownResult = await breakdownTaskCommandHandler.Handle(new BreakdownTaskCommand
        {
            TaskId = taskItemId,
            UserId = command.UserId
        }, ct);

        if (breakdownResult.IsSuccess && breakdownResult.Subtasks.Count > 0)
        {
            await replaceSubtasksCommandHandler.Handle(new ReplaceSubtasksCommand
            {
                TaskId = taskItemId,
                Subtasks = breakdownResult.Subtasks.Select(subtask => new SubtaskDto
                {
                    Title = subtask.Title,
                    Duration = subtask.Duration,
                    Order = subtask.Order
                }).ToList()
            }, ct);
        }

        logger.LogInformation(
            "Breakdown and replace completed for TaskItem {TaskItemId}. Success={IsSuccess}, SubtaskCount={SubtaskCount}",
            taskItemId,
            breakdownResult.IsSuccess,
            breakdownResult.Subtasks.Count);

        return new BreakdownAndReplaceTaskResult
        {
            TaskItemId = taskItemId,
            IsSuccess = breakdownResult.IsSuccess,
            Subtasks = breakdownResult.Subtasks,
            ErrorMessage = breakdownResult.ErrorMessage
        };
    }
}
