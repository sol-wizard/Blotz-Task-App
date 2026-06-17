using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class DeleteRecurringOccurrenceRequest
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
    public bool DeleteFuture { get; init; }
}

public class DeleteRecurringOccurrenceCommand
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
    public required bool DeleteFuture { get; init; }
    public required Guid UserId { get; init; }
}

public class DeleteRecurringOccurrenceCommandHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<DeleteRecurringOccurrenceCommandHandler> logger)
{
    public async Task Handle(DeleteRecurringOccurrenceCommand command, CancellationToken ct = default)
    {
        var template = await db.RecurringTasks
            .Include(r => r.Series)
            .FirstOrDefaultAsync(r => r.Id == command.RecurringTaskId && r.UserId == command.UserId, ct);

        if (template == null)
        {
            throw new NotFoundException($"RecurringTask {command.RecurringTaskId} not found.");
        }

        template = await ResolveTemplateForOccurrence(template, command.OccurrenceDate, command.UserId, ct);

        if (!generatorService.IsOccurrenceOn(template, command.OccurrenceDate))
        {
            throw new ValidationException("OccurrenceDate must be a valid occurrence date for this recurring task.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        if (command.DeleteFuture)
        {
            await DeleteFutureOccurrences(template, command.OccurrenceDate, command.UserId, ct);
        }
        else
        {
            await DeleteSingleOccurrence(template, command.OccurrenceDate, command.UserId, ct);
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "Deleted recurring occurrence for RecurringTask {RecurringTaskId} on {OccurrenceDate} with DeleteFuture={DeleteFuture} for user {UserId}",
            command.RecurringTaskId,
            command.OccurrenceDate,
            command.DeleteFuture,
            command.UserId);
    }

    private async Task DeleteSingleOccurrence(
        RecurringTask template,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        var recurringOverride = await db.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .SingleOrDefaultAsync(o => o.SeriesId == template.SeriesId
                && o.RecurringTaskId == template.Id
                && o.OccurrenceDate == occurrenceDate
                && o.Series.UserId == userId, ct);

        if (recurringOverride?.OverrideType == RecurringOccurrenceOverrideType.Detached)
        {
            throw new ValidationException("Detached occurrences must be deleted as normal tasks.");
        }

        if (recurringOverride?.TaskItem != null)
        {
            db.TaskItems.Remove(recurringOverride.TaskItem);
        }

        if (recurringOverride == null)
        {
            recurringOverride = new RecurringOccurrenceOverride
            {
                SeriesId = template.SeriesId,
                RecurringTaskId = template.Id,
                OccurrenceDate = occurrenceDate,
                OverrideType = RecurringOccurrenceOverrideType.Skipped,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.RecurringOccurrenceOverrides.Add(recurringOverride);
            return;
        }

        recurringOverride.RecurringTaskId = template.Id;
        recurringOverride.OverrideType = RecurringOccurrenceOverrideType.Skipped;
        recurringOverride.UpdatedAt = DateTime.UtcNow;
    }

    private async Task DeleteFutureOccurrences(
        RecurringTask template,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        TruncateTemplate(template, occurrenceDate);
        await MarkSeriesDeletedIfNoActiveTemplates(template, ct);

        var futureOverrides = await db.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .Where(o => o.SeriesId == template.SeriesId
                && o.Series.UserId == userId
                && o.RecurringTaskId == template.Id
                && o.OccurrenceDate >= occurrenceDate
                && o.OverrideType != RecurringOccurrenceOverrideType.Detached)
            .ToListAsync(ct);

        foreach (var recurringOverride in futureOverrides)
        {
            if (recurringOverride.TaskItem != null)
            {
                db.TaskItems.Remove(recurringOverride.TaskItem);
            }

            db.RecurringOccurrenceOverrides.Remove(recurringOverride);
        }
    }

    private async Task MarkSeriesDeletedIfNoActiveTemplates(RecurringTask template, CancellationToken ct)
    {
        if (template.IsActive)
        {
            return;
        }

        var hasOtherActiveTemplate = await db.RecurringTasks
            .AnyAsync(r => r.SeriesId == template.SeriesId
                && r.Id != template.Id
                && r.IsActive, ct);

        if (hasOtherActiveTemplate)
        {
            return;
        }

        template.Series.IsDeleted = true;
        template.Series.UpdatedAt = DateTime.UtcNow;
    }

    private static void TruncateTemplate(RecurringTask template, DateOnly occurrenceDate)
    {
        if (occurrenceDate <= template.StartDate)
        {
            template.EndDate = template.StartDate;
            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;
            return;
        }

        template.EndDate = occurrenceDate.AddDays(-1);
        template.UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateOccurrence(RecurringTask template, DateOnly occurrenceDate)
    {
        if (!IsTemplateEffectiveOn(template, occurrenceDate)
            || template.Series.IsDeleted)
        {
            throw new ValidationException("OccurrenceDate is outside recurring task range.");
        }
    }

    private async Task<RecurringTask> ResolveTemplateForOccurrence(
        RecurringTask requestedTemplate,
        DateOnly occurrenceDate,
        Guid userId,
        CancellationToken ct)
    {
        if (requestedTemplate.Series.IsDeleted)
        {
            throw new ValidationException("OccurrenceDate is outside recurring task range.");
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
            ValidateOccurrence(requestedTemplate, occurrenceDate);
        }

        return effectiveTemplate!;
    }

    private static bool IsTemplateEffectiveOn(RecurringTask template, DateOnly occurrenceDate)
    {
        return template.IsActive
            && template.StartDate <= occurrenceDate
            && (template.EndDate == null || template.EndDate >= occurrenceDate);
    }
}
