using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Domain.Services;

public class RecurringOccurrenceMaterializer(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<RecurringOccurrenceMaterializer>? logger = null)
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

        template = await ResolveTemplateForOccurrence(template, occurrenceDate, userId, ct);

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

        if (existingOverride != null)
        {
            logger?.LogWarning(
                "Recurring occurrence override {OverrideId} for series {SeriesId} on {OccurrenceDate} had no TaskItem. Reattaching a generated TaskItem while preserving OverrideType={OverrideType} and RecurringTaskId={RecurringTaskId}.",
                existingOverride.Id,
                existingOverride.SeriesId,
                existingOverride.OccurrenceDate,
                existingOverride.OverrideType,
                existingOverride.RecurringTaskId);
        }

        recurringOverride.TaskItem = taskItem;
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

    private async Task<RecurringTask> ResolveTemplateForOccurrence(
        RecurringTask requestedTemplate,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        if (requestedTemplate.Series.IsDeleted)
        {
            throw new ValidationException("Occurrence date is outside recurring task range.");
        }

        if (IsTemplateEffectiveOn(requestedTemplate, occurrenceDate))
        {
            return requestedTemplate;
        }

        var effectiveTemplate = await db.RecurringTasks
            .Include(r => r.Series)
            .Where(r => r.SeriesId == requestedTemplate.SeriesId
                && r.UserId == userId
                && r.IsActive
                && r.StartDate <= occurrenceDate
                && (r.EndDate == null || r.EndDate >= occurrenceDate))
            .OrderByDescending(r => r.StartDate)
            .ThenByDescending(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (effectiveTemplate == null || effectiveTemplate.Series.IsDeleted)
        {
            throw new ValidationException("Occurrence date is outside recurring task range.");
        }

        return effectiveTemplate;
    }

    private static bool IsTemplateEffectiveOn(RecurringTask template, DateOnly occurrenceDate)
    {
        return template.IsActive
            && template.StartDate <= occurrenceDate
            && (template.EndDate == null || template.EndDate >= occurrenceDate);
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
