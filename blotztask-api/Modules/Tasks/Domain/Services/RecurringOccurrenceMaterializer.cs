using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Domain.Services;

public class RecurringOccurrenceMaterializer(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService)
{
    public async Task<TaskItem> EnsureRecurringOccurrenceTaskItem(
        int recurringTaskId,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct = default)
    {
        var template = await db.RecurringTasks
            .FirstOrDefaultAsync(r => r.Id == recurringTaskId && r.UserId == userId, ct);

        if (template == null)
            throw new NotFoundException($"RecurringTask {recurringTaskId} not found.");

        if (!template.IsActive
            || template.StartDate > occurrenceDate
            || (template.EndDate != null && template.EndDate < occurrenceDate))
        {
            throw new ValidationException("Occurrence date is outside recurring task range.");
        }

        if (!generatorService.IsOccurrenceOn(template, occurrenceDate))
        {
            throw new ValidationException("Occurrence date is not valid for this recurring task.");
        }

        var existing = await FindExistingOccurrence(recurringTaskId, occurrenceDate, userId, ct);

        if (existing != null) return existing;

        var taskItem = RecurringTaskGeneratorService.CreateTaskItem(template, occurrenceDate);
        taskItem.RecurringOccurrenceDate = occurrenceDate;
        taskItem.IsDone = false;
        taskItem.CreatedAt = DateTime.UtcNow;
        taskItem.UpdatedAt = DateTime.UtcNow;

        db.TaskItems.Add(taskItem);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            db.Entry(taskItem).State = EntityState.Detached;

            var existingAfterConflict = await FindExistingOccurrence(recurringTaskId, occurrenceDate, userId, ct);
            if (existingAfterConflict != null) return existingAfterConflict;

            throw;
        }

        return taskItem;
    }

    private Task<TaskItem?> FindExistingOccurrence(
        int recurringTaskId,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        return db.TaskItems.SingleOrDefaultAsync(t => t.UserId == userId
            && t.RecurringTaskId == recurringTaskId
            && t.RecurringOccurrenceDate == occurrenceDate, ct);
    }
}
