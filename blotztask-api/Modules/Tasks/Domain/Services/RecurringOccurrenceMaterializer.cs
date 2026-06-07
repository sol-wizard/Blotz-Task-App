using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
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
            .Include(r => r.Series)
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

        var existingOverride = await FindExistingOverride(template.SeriesId, occurrenceDate, userId, ct);

        if (existingOverride?.OverrideType is RecurringOccurrenceOverrideType.Skipped
            or RecurringOccurrenceOverrideType.Detached)
        {
            throw new ValidationException("Occurrence date has been removed from this recurring task.");
        }

        if (existingOverride?.TaskItem != null) return existingOverride.TaskItem;

        var taskItem = generatorService.CreateTaskItem(template, occurrenceDate);
        taskItem.IsDone = false;
        taskItem.CreatedAt = DateTime.UtcNow;
        taskItem.UpdatedAt = DateTime.UtcNow;

        var recurringOverride = existingOverride ?? new RecurringOccurrenceOverride
        {
            SeriesId = template.SeriesId,
            RecurringTaskId = template.Id,
            OccurrenceDate = occurrenceDate,
            OverrideType = RecurringOccurrenceOverrideType.Materialized,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        recurringOverride.TaskItem = taskItem;
        recurringOverride.OverrideType = RecurringOccurrenceOverrideType.Materialized;
        recurringOverride.UpdatedAt = DateTime.UtcNow;
        taskItem.RecurringOccurrenceOverride = recurringOverride;

        if (existingOverride == null)
        {
            db.RecurringOccurrenceOverrides.Add(recurringOverride);
        }

        db.TaskItems.Add(taskItem);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            db.Entry(taskItem).State = EntityState.Detached;
            if (existingOverride == null)
            {
                db.Entry(recurringOverride).State = EntityState.Detached;
            }

            var existingAfterConflict = await FindExistingOverride(template.SeriesId, occurrenceDate, userId, ct);
            if (existingAfterConflict?.TaskItem != null) return existingAfterConflict.TaskItem;

            throw;
        }

        return taskItem;
    }

    private Task<RecurringOccurrenceOverride?> FindExistingOverride(
        int seriesId,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        return db.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .SingleOrDefaultAsync(o => o.SeriesId == seriesId
                && o.OccurrenceDate == occurrenceDate
                && o.Series.UserId == userId, ct);
    }
}
