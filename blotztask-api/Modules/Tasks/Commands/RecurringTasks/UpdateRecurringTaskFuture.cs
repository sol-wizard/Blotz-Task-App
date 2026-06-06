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

        if (!generatorService.IsOccurrenceOn(template, command.EffectiveDate))
        {
            throw new ValidationException("EffectiveDate must be a valid occurrence date for this recurring task.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        if (command.StopRepeating)
        {
            var taskItem = await materializer.EnsureRecurringOccurrenceTaskItem(
                command.RecurringTaskId,
                command.EffectiveDate,
                command.UserId,
                ct);

            await db.Entry(taskItem).Reference(t => t.Deadline).LoadAsync(ct);
            taskItemUpdater.Apply(taskItem, command.TaskDetails);

            TruncateTemplate(template, command.EffectiveDate);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            logger.LogInformation(
                "Stopped RecurringTask {RecurringTaskId} from {EffectiveDate} for user {UserId}",
                command.RecurringTaskId,
                command.EffectiveDate,
                command.UserId);

            return null;
        }

        var newPattern = BuildPattern(template, command);
        var newEndDate = command.EndDateChanged ? command.EndDate : template.EndDate;
        ValidateRecurrence(newPattern, command.EffectiveDate, newEndDate);

        var futureTemplate = BuildFutureTemplate(template, command, newPattern, newEndDate);
        TruncateTemplate(template, command.EffectiveDate);

        db.RecurringTasks.Add(futureTemplate);
        await db.SaveChangesAsync(ct);

        var existingFutureOccurrences = await db.TaskItems
            .Include(t => t.Deadline)
            .Where(t => t.UserId == command.UserId
                && t.RecurringTaskId == command.RecurringTaskId
                && t.RecurringOccurrenceDate >= command.EffectiveDate)
            .ToListAsync(ct);

        foreach (var occurrence in existingFutureOccurrences)
        {
            if (occurrence.RecurringOccurrenceDate == command.EffectiveDate)
            {
                taskItemUpdater.Apply(occurrence, command.TaskDetails);
            }

            occurrence.RecurringTaskId = futureTemplate.Id;
            db.TaskItems.Update(occurrence);
        }

        if (existingFutureOccurrences.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }

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
        if (!template.IsActive
            || template.StartDate > effectiveDate
            || (template.EndDate != null && template.EndDate < effectiveDate))
        {
            throw new ValidationException("EffectiveDate is outside recurring task range.");
        }
    }

    private static RecurrencePattern BuildPattern(
        RecurringTask template,
        UpdateRecurringTaskFutureCommand command)
    {
        var frequency = command.Frequency ?? template.Pattern.Frequency;
        return new RecurrencePattern
        {
            Frequency = frequency,
            Interval = command.Interval ?? template.Pattern.Interval,
            DaysOfWeek = frequency == RecurrenceFrequency.Weekly
                ? command.DaysOfWeek ?? template.Pattern.DaysOfWeek
                : null,
            DayOfMonth = frequency == RecurrenceFrequency.Monthly
                ? command.DayOfMonth ?? command.EffectiveDate.Day
                : null
        };
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
            throw new ValidationException("EndDate must be later than or equal to EffectiveDate.");
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
        DateOnly? endDate)
    {
        var details = command.TaskDetails;
        var title = (details.Title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(title))
        {
            throw new ValidationException("Title is required.");
        }

        var now = DateTime.UtcNow;
        var deadlineTemplate = BuildDeadlineTemplate(details, command.EffectiveDate, command.DeadlineTimeZoneId);

        return new RecurringTask
        {
            UserId = oldTemplate.UserId,
            Title = title,
            Description = string.IsNullOrWhiteSpace(details.Description)
                ? null
                : details.Description.Trim(),
            TimeType = details.TimeType,
            LabelId = details.LabelId,
            TemplateStartTime = details.StartTime,
            TemplateEndTime = details.TimeType == TaskTimeType.SingleTime ? null : details.EndTime,
            IsDeadline = deadlineTemplate.IsDeadline,
            DeadlineOffsetDays = deadlineTemplate.OffsetDays,
            DeadlineTimeOfDay = deadlineTemplate.TimeOfDay,
            DeadlineTimeZoneId = deadlineTemplate.TimeZoneId,
            Pattern = pattern,
            StartDate = command.EffectiveDate,
            EndDate = endDate,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    private static RecurringDeadlineTemplate BuildDeadlineTemplate(
        EditTaskItemDto details,
        DateOnly effectiveDate,
        string? deadlineTimeZoneId)
    {
        if (details.IsDeadline != true)
        {
            return new RecurringDeadlineTemplate(false, null, null, null);
        }

        var dueAt = details.DueAt ?? details.EndTime;
        if (dueAt < details.EndTime)
        {
            throw new ValidationException("DueAt cannot be before the task end time.");
        }

        var offsetDays = DateOnly.FromDateTime(dueAt.Date).DayNumber - effectiveDate.DayNumber;
        if (offsetDays < 0)
        {
            throw new ValidationException("DueAt cannot be before EffectiveDate.");
        }

        var timeZoneId = deadlineTimeZoneId?.Trim();
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            throw new ValidationException("DeadlineTimeZoneId is required for recurring deadline tasks.");
        }

        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ValidationException("DeadlineTimeZoneId is not valid.");
        }
        catch (InvalidTimeZoneException)
        {
            throw new ValidationException("DeadlineTimeZoneId is not valid.");
        }

        return new RecurringDeadlineTemplate(
            true,
            offsetDays,
            TimeOnly.FromTimeSpan(dueAt.TimeOfDay),
            timeZoneId);
    }

    private static void TruncateTemplate(RecurringTask template, DateOnly effectiveDate)
    {
        template.EndDate = effectiveDate.AddDays(-1);
        template.UpdatedAt = DateTime.UtcNow;
    }

    private sealed record RecurringDeadlineTemplate(
        bool IsDeadline,
        int? OffsetDays,
        TimeOnly? TimeOfDay,
        string? TimeZoneId);
}
