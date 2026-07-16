using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Services;
using BlotzTask.Modules.Tasks.Shared;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class UpdateRecurringTaskFutureRequest
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly EffectiveDate { get; init; }
    public required EditTaskItemDto TaskDetails { get; init; }
    public bool StopRepeating { get; init; }
    public RecurrenceFrequency? Frequency { get; init; }
    public int? Interval { get; init; }
    public int? DaysOfWeek { get; init; }
    public int? DayOfMonth { get; init; }
    public DateOnly? EndDate { get; init; }
    public bool EndDateChanged { get; init; }
    public string? ScheduleTimeZoneId { get; init; }
    public string? DeadlineTimeZoneId { get; init; }
}

public class UpdateRecurringTaskFutureCommand
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly EffectiveDate { get; init; }
    public required EditTaskItemDto TaskDetails { get; init; }
    public required Guid UserId { get; init; }
    public bool StopRepeating { get; init; }
    public RecurrenceFrequency? Frequency { get; init; }
    public int? Interval { get; init; }
    public int? DaysOfWeek { get; init; }
    public int? DayOfMonth { get; init; }
    public DateOnly? EndDate { get; init; }
    public bool EndDateChanged { get; init; }
    public string? ScheduleTimeZoneId { get; init; }
    public string? DeadlineTimeZoneId { get; init; }
}

public class UpdateRecurringTaskFutureCommandHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    RecurringOccurrenceMaterializer materializer,
    TaskItemUpdater taskItemUpdater,
    ILogger<UpdateRecurringTaskFutureCommandHandler> logger)
{
    public async Task<int?> Handle(UpdateRecurringTaskFutureCommand command, CancellationToken ct = default)
    {
        var template = await db.RecurringTasks
            .Include(r => r.Series)
            .FirstOrDefaultAsync(r => r.Id == command.RecurringTaskId && r.UserId == command.UserId, ct);

        if (template == null)
        {
            throw new NotFoundException($"RecurringTask {command.RecurringTaskId} not found.");
        }

        ValidateEffectiveDate(template, command.EffectiveDate);
        TaskTimeValidator.ValidateTaskTimes(
            command.TaskDetails.StartTime,
            command.TaskDetails.EndTime,
            command.TaskDetails.TimeType);

        var futureStartDate = DateOnly.FromDateTime(command.TaskDetails.StartTime.Date);

        if (!generatorService.IsOccurrenceOn(template, command.EffectiveDate))
        {
            throw new ValidationException("EffectiveDate must be a valid occurrence date for this recurring task.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        if (command.StopRepeating)
        {
            var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
                template.Id,
                command.EffectiveDate,
                command.UserId,
                ct);

            await db.Entry(taskItem).Reference(t => t.Deadline).LoadAsync(ct);
            await db.Entry(taskItem).Reference(t => t.RecurringOccurrenceOverride).LoadAsync(ct);
            taskItemUpdater.Apply(taskItem, command.TaskDetails);
            if (taskItem.RecurringOccurrenceOverride != null)
            {
                taskItem.RecurringOccurrenceOverride.OverrideType = RecurringOccurrenceOverrideType.Detached;
                taskItem.RecurringOccurrenceOverride.UpdatedAt = DateTime.UtcNow;
            }

            await RemoveFutureRecurringOverrides(template, command.EffectiveDate, command.UserId, ct);
            TruncateTemplate(template, command.EffectiveDate);
            await MarkSeriesDeletedIfNoActiveTemplates(template, ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            logger.LogInformation(
                "Stopped RecurringTask {RecurringTaskId} from {EffectiveDate} for user {UserId}",
                command.RecurringTaskId,
                command.EffectiveDate,
                command.UserId);

            return null;
        }

        var targetFrequency = command.Frequency ?? template.Pattern.Frequency;
        ValidateRecurrenceFieldUsage(command, targetFrequency);

        var newPattern = BuildPattern(template, command, targetFrequency, futureStartDate);
        var newEndDate = command.EndDateChanged ? command.EndDate : template.EndDate;
        ValidateRecurrence(newPattern, futureStartDate, newEndDate);

        var futureTemplate = BuildFutureTemplate(template, command, newPattern, futureStartDate, newEndDate);
        if (!generatorService.IsOccurrenceOn(futureTemplate, futureStartDate))
        {
            throw new ValidationException("Future task start date must be a valid occurrence date for the updated recurring task.");
        }

        TruncateTemplate(template, command.EffectiveDate);

        db.RecurringTasks.Add(futureTemplate);
        await db.SaveChangesAsync(ct);

        var futureOverrides = await db.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .ThenInclude(t => t!.Deadline)
            .Where(o => o.SeriesId == template.SeriesId
                && o.RecurringTaskId == template.Id
                && o.OccurrenceDate >= command.EffectiveDate
                && o.OverrideType != RecurringOccurrenceOverrideType.Detached)
            .ToListAsync(ct);

        foreach (var recurringOverride in futureOverrides)
        {
            if (!generatorService.IsOccurrenceOn(futureTemplate, recurringOverride.OccurrenceDate))
            {
                if (recurringOverride.TaskItem != null)
                {
                    db.TaskItems.Remove(recurringOverride.TaskItem);
                }

                db.RecurringOccurrenceOverrides.Remove(recurringOverride);
                continue;
            }

            if (recurringOverride.OverrideType == RecurringOccurrenceOverrideType.Materialized
                && recurringOverride.TaskItem != null)
            {
                var occurrenceDetails = BuildOccurrenceTaskDetails(futureTemplate, recurringOverride.OccurrenceDate, recurringOverride.TaskItem);
                taskItemUpdater.Apply(recurringOverride.TaskItem, occurrenceDetails);
            }

            if (recurringOverride.OverrideType == RecurringOccurrenceOverrideType.Modified
                && recurringOverride.OccurrenceDate == command.EffectiveDate
                && recurringOverride.TaskItem != null)
            {
                taskItemUpdater.Apply(recurringOverride.TaskItem, command.TaskDetails);
            }

            recurringOverride.RecurringTaskId = futureTemplate.Id;
            recurringOverride.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "Split RecurringTask {OldRecurringTaskId} into future RecurringTask {NewRecurringTaskId} from {EffectiveDate} for user {UserId}",
            command.RecurringTaskId,
            futureTemplate.Id,
            command.EffectiveDate,
            command.UserId);

        return futureTemplate.Id;
    }

    private static void ValidateEffectiveDate(RecurringTask template, DateOnly effectiveDate)
    {
        if (template.Series.IsDeleted || !IsTemplateEffectiveOn(template, effectiveDate))
        {
            throw new ValidationException("EffectiveDate is outside recurring task range.");
        }
    }

    private static bool IsTemplateEffectiveOn(RecurringTask template, DateOnly effectiveDate)
    {
        return template.IsActive
            && template.StartDate <= effectiveDate
            && (template.EndDate == null || template.EndDate >= effectiveDate);
    }

    private static RecurrencePattern BuildPattern(
        RecurringTask template,
        UpdateRecurringTaskFutureCommand command,
        RecurrenceFrequency frequency,
        DateOnly futureStartDate)
    {
        return new RecurrencePattern
        {
            Frequency = frequency,
            Interval = command.Interval ?? template.Pattern.Interval,
            DaysOfWeek = frequency == RecurrenceFrequency.Weekly
                ? command.DaysOfWeek ?? template.Pattern.DaysOfWeek
                : null,
            DayOfMonth = frequency == RecurrenceFrequency.Monthly
                ? command.DayOfMonth ?? futureStartDate.Day
                : null
        };
    }

    private static void ValidateRecurrenceFieldUsage(
        UpdateRecurringTaskFutureCommand command,
        RecurrenceFrequency frequency)
    {
        if (frequency != RecurrenceFrequency.Weekly && command.DaysOfWeek != null)
        {
            throw new ValidationException("DaysOfWeek can only be set for weekly recurring tasks.");
        }

        if (frequency != RecurrenceFrequency.Monthly && command.DayOfMonth != null)
        {
            throw new ValidationException("DayOfMonth can only be set for monthly recurring tasks.");
        }
    }

    private static void ValidateRecurrence(
        RecurrencePattern pattern,
        DateOnly startDate,
        DateOnly? endDate)
    {
        if (pattern.Interval < 1)
        {
            throw new ValidationException("Interval must be greater than or equal to 1.");
        }

        if (endDate != null && endDate < startDate)
        {
            throw new ValidationException("EndDate must be later than or equal to the recurring task start date.");
        }

        if (pattern.DaysOfWeek is < 0 or > 127)
        {
            throw new ValidationException("DaysOfWeek must contain only valid weekday flags.");
        }

        if (pattern.DayOfMonth is < 1 or > 31)
        {
            throw new ValidationException("DayOfMonth must be between 1 and 31.");
        }

        if (pattern.Frequency == RecurrenceFrequency.Weekly
            && (pattern.DaysOfWeek == null || pattern.DaysOfWeek == (int)WeeklyDayFlags.None))
        {
            throw new ValidationException("DaysOfWeek is required for weekly recurring tasks.");
        }
    }

    private static RecurringTask BuildFutureTemplate(
        RecurringTask oldTemplate,
        UpdateRecurringTaskFutureCommand command,
        RecurrencePattern pattern,
        DateOnly futureStartDate,
        DateOnly? endDate)
    {
        var details = command.TaskDetails;
        var title = (details.Title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(title))
        {
            throw new ValidationException("Title is required.");
        }

        var now = DateTime.UtcNow;
        var deadlineTemplate = BuildDeadlineTemplate(details, futureStartDate, command.DeadlineTimeZoneId);
        var scheduleTimeZoneId = ValidateTimeZoneId(
            command.ScheduleTimeZoneId ?? oldTemplate.ScheduleTimeZoneId,
            "ScheduleTimeZoneId");

        return new RecurringTask
        {
            UserId = oldTemplate.UserId,
            SeriesId = oldTemplate.SeriesId,
            PreviousRecurringTaskId = oldTemplate.Id,
            Title = title,
            Description = string.IsNullOrWhiteSpace(details.Description)
                ? null
                : details.Description.Trim(),
            TimeType = details.TimeType,
            LabelId = details.LabelId,
            TemplateStartTime = details.StartTime,
            TemplateEndTime = details.TimeType == TaskTimeType.SingleTime ? null : details.EndTime,
            ScheduleTimeZoneId = scheduleTimeZoneId,
            IsDeadline = deadlineTemplate.IsDeadline,
            DeadlineOffsetDays = deadlineTemplate.OffsetDays,
            DeadlineTimeOfDay = deadlineTemplate.TimeOfDay,
            DeadlineTimeZoneId = deadlineTemplate.TimeZoneId,
            Pattern = pattern,
            StartDate = futureStartDate,
            EndDate = endDate,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    private static RecurringDeadlineTemplate BuildDeadlineTemplate(
        EditTaskItemDto details,
        DateOnly templateStartDate,
        string? deadlineTimeZoneId)
    {
        if (details.IsDeadline != true)
        {
            return new RecurringDeadlineTemplate(false, null, null, null);
        }

        if (details.DueAt == null)
        {
            throw new ValidationException("DueAt is required when IsDeadline is true.");
        }

        var dueAt = details.DueAt.Value;
        if (dueAt < details.EndTime)
        {
            throw new ValidationException("DueAt cannot be before the task end time.");
        }

        var offsetDays = DateOnly.FromDateTime(dueAt.Date).DayNumber - templateStartDate.DayNumber;
        if (offsetDays < 0)
        {
            throw new ValidationException("DueAt cannot be before the recurring task start date.");
        }

        var timeZoneId = ValidateTimeZoneId(deadlineTimeZoneId, "DeadlineTimeZoneId");

        return new RecurringDeadlineTemplate(
            true,
            offsetDays,
            TimeOnly.FromTimeSpan(dueAt.TimeOfDay),
            timeZoneId);
    }

    private static void TruncateTemplate(RecurringTask template, DateOnly effectiveDate)
    {
        if (effectiveDate <= template.StartDate)
        {
            template.EndDate = template.StartDate;
            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;
            return;
        }

        template.EndDate = effectiveDate.AddDays(-1);
        template.UpdatedAt = DateTime.UtcNow;
    }

    private async Task RemoveFutureRecurringOverrides(
        RecurringTask template,
        DateOnly effectiveDate,
        Guid userId,
        CancellationToken ct)
    {
        var futureOverrides = await db.RecurringOccurrenceOverrides
            .Include(o => o.TaskItem)
            .Where(o => o.SeriesId == template.SeriesId
                && o.Series.UserId == userId
                && o.RecurringTaskId == template.Id
                && o.OccurrenceDate > effectiveDate
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

    private static EditTaskItemDto BuildOccurrenceTaskDetails(
        RecurringTask template,
        DateOnly occurrenceDate,
        TaskItem existingTask)
    {
        var generator = new RecurringTaskGeneratorService();
        return new EditTaskItemDto
        {
            Title = template.Title,
            Description = template.Description,
            StartTime = generator.BuildOccurrenceStartTime(template, occurrenceDate),
            EndTime = generator.BuildOccurrenceEndTime(template, occurrenceDate),
            TimeType = template.TimeType,
            LabelId = template.LabelId,
            NotificationId = existingTask.NotificationId,
            AlertTime = existingTask.AlertTime,
            IsDeadline = template.IsDeadline,
            DueAt = template.IsDeadline
                ? generator.BuildOccurrenceDueAt(template, occurrenceDate)
                : null
        };
    }

    private sealed record RecurringDeadlineTemplate(
        bool IsDeadline,
        int? OffsetDays,
        TimeOnly? TimeOfDay,
        string? TimeZoneId);

    private static string ValidateTimeZoneId(string? timeZoneId, string fieldName)
    {
        var trimmed = timeZoneId?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new ValidationException($"{fieldName} is required for recurring tasks.");
        }

        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(trimmed);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ValidationException($"{fieldName} is not valid.");
        }
        catch (InvalidTimeZoneException)
        {
            throw new ValidationException($"{fieldName} is not valid.");
        }

        return trimmed;
    }
}
