using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.BreakDown.Services;

// Turns what the app sends (a task id, or a repeating task + day) into the TaskItem to break down.
// A repeating day with no saved TaskItem yet gets one created here.
public class BreakdownTargetResolver(BlotzTaskDbContext db, RecurringOccurrenceMaterializer materializer)
{
    public async Task<int> ResolveTaskItemId(
        int? taskId,
        int? recurringTaskId,
        DateOnly? occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        var hasTaskId = taskId.HasValue;
        var hasRecurringIdentity = recurringTaskId.HasValue || occurrenceDate.HasValue;

        if (hasTaskId == hasRecurringIdentity)
        {
            throw new ValidationException(
                "Provide either taskId or both recurringTaskId and occurrenceDate.");
        }

        if (hasTaskId)
        {
            var id = taskId.GetValueOrDefault();
            var taskExists = await db.TaskItems.AnyAsync(
                task => task.Id == id && task.UserId == userId,
                ct);

            if (!taskExists)
            {
                throw new NotFoundException($"Task with ID {id} not found.");
            }

            return id;
        }

        if (!recurringTaskId.HasValue || !occurrenceDate.HasValue)
        {
            throw new ValidationException(
                "recurringTaskId and occurrenceDate are both required for recurring task breakdown.");
        }

        var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
            recurringTaskId.GetValueOrDefault(),
            occurrenceDate.GetValueOrDefault(),
            userId,
            ct);

        return taskItem.Id;
    }
}
