using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

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
    BlotzTaskDbContext db,
    RecurringOccurrenceMaterializer materializer,
    BreakdownTaskCommandHandler breakdownTaskCommandHandler,
    ReplaceSubtasksCommandHandler replaceSubtasksCommandHandler,
    ILogger<BreakdownAndReplaceTaskCommandHandler> logger)
{
    public async Task<BreakdownAndReplaceTaskResult> Handle(
        BreakdownAndReplaceTaskCommand command,
        CancellationToken ct = default)
    {
        var taskItemId = await ResolveTaskItemId(command, ct);

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

    private async Task<int> ResolveTaskItemId(
        BreakdownAndReplaceTaskCommand command,
        CancellationToken ct)
    {
        var hasTaskId = command.TaskId.HasValue;
        var hasRecurringIdentity = command.RecurringTaskId.HasValue || command.OccurrenceDate.HasValue;

        if (hasTaskId == hasRecurringIdentity)
        {
            throw new ValidationException(
                "Provide either taskId or both recurringTaskId and occurrenceDate.");
        }

        if (hasTaskId)
        {
            var taskId = command.TaskId.GetValueOrDefault();
            var taskExists = await db.TaskItems.AnyAsync(
                task => task.Id == taskId && task.UserId == command.UserId,
                ct);

            if (!taskExists)
            {
                throw new NotFoundException($"Task with ID {taskId} not found.");
            }

            return taskId;
        }

        if (!command.RecurringTaskId.HasValue || !command.OccurrenceDate.HasValue)
        {
            throw new ValidationException(
                "recurringTaskId and occurrenceDate are both required for recurring task breakdown.");
        }

        var recurringTaskId = command.RecurringTaskId.GetValueOrDefault();
        var occurrenceDate = command.OccurrenceDate.GetValueOrDefault();
        var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
            recurringTaskId,
            occurrenceDate,
            command.UserId,
            ct);

        return taskItem.Id;
    }
}
