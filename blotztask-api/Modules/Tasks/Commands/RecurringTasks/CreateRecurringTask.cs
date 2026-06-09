using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Shared;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class CreateRecurringTaskRequest
{
    public required string Title { get; init; }
    public string? Description { get; init; }
    public required TaskTimeType TimeType { get; init; }
    public int? LabelId { get; init; }
    public required DateTimeOffset TemplateStartTime { get; init; }
    public DateTimeOffset? TemplateEndTime { get; init; }
    public required string ScheduleTimeZoneId { get; init; }
    public required RecurrenceFrequency Frequency { get; init; }
    public int Interval { get; init; } = 1;
    public int? DaysOfWeek { get; init; }
    public int? DayOfMonth { get; init; }
    public required DateOnly StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public bool? IsDeadline { get; init; }
    public DateTimeOffset? TemplateDueAt { get; init; }
    public string? DeadlineTimeZoneId { get; init; }
}

public class CreateRecurringTaskCommand
{
    public required Guid UserId { get; init; }
    public required CreateRecurringTaskRequest TaskDetails { get; init; }
}

public class CreateRecurringTaskResult
{
    public required int SeriesId { get; init; }
    public required int RecurringTaskId { get; init; }
}

public class CreateRecurringTaskCommandHandler(
    BlotzTaskDbContext db,
    ILogger<CreateRecurringTaskCommandHandler> logger)
{
    public async Task<CreateRecurringTaskResult> Handle(CreateRecurringTaskCommand command, CancellationToken ct = default)
    {
        var details = command.TaskDetails;
        logger.LogInformation("Creating recurring task for user {UserId}", command.UserId);

        var title = (details.Title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(title))
        {
            throw new ValidationException("Title is required.");
        }

        var templateEndTime = details.TimeType == TaskTimeType.SingleTime
            ? details.TemplateStartTime
            : details.TemplateEndTime;

        TaskTimeValidator.ValidateTaskTimes(details.TemplateStartTime, templateEndTime, details.TimeType);
        ValidateTemplateDates(details, templateEndTime!.Value);
        ValidateRecurrence(details);
        var scheduleTimeZoneId = ValidateTimeZoneId(details.ScheduleTimeZoneId, "ScheduleTimeZoneId");

        var deadlineTemplate = BuildDeadlineTemplate(details, templateEndTime.Value);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var now = DateTime.UtcNow;
        var series = new RecurringTaskSeries
        {
            UserId = command.UserId,
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.RecurringTaskSeries.Add(series);
        await db.SaveChangesAsync(ct);

        var recurringTask = new RecurringTask
        {
            SeriesId = series.Id,
            UserId = command.UserId,
            Title = title,
            Description = string.IsNullOrWhiteSpace(details.Description)
                ? null
                : details.Description.Trim(),
            TimeType = details.TimeType,
            LabelId = details.LabelId,
            TemplateStartTime = details.TemplateStartTime,
            TemplateEndTime = details.TimeType == TaskTimeType.SingleTime ? null : details.TemplateEndTime,
            ScheduleTimeZoneId = scheduleTimeZoneId,
            IsDeadline = deadlineTemplate.IsDeadline,
            DeadlineOffsetDays = deadlineTemplate.OffsetDays,
            DeadlineTimeOfDay = deadlineTemplate.TimeOfDay,
            DeadlineTimeZoneId = deadlineTemplate.TimeZoneId,
            Pattern = new RecurrencePattern
            {
                Frequency = details.Frequency,
                Interval = details.Interval,
                DaysOfWeek = details.Frequency == RecurrenceFrequency.Weekly ? details.DaysOfWeek : null,
                DayOfMonth = details.Frequency == RecurrenceFrequency.Monthly
                    ? details.DayOfMonth ?? details.StartDate.Day
                    : null
            },
            StartDate = details.StartDate,
            EndDate = details.EndDate,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.RecurringTasks.Add(recurringTask);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "RecurringTask {RecurringTaskId} was successfully created for user {UserId}",
            recurringTask.Id,
            command.UserId);

        return new CreateRecurringTaskResult
        {
            SeriesId = series.Id,
            RecurringTaskId = recurringTask.Id
        };
    }

    private static void ValidateRecurrence(CreateRecurringTaskRequest details)
    {
        if (details.Interval < 1)
        {
            throw new ValidationException("Interval must be greater than or equal to 1.");
        }

        if (details.EndDate != null && details.EndDate < details.StartDate)
        {
            throw new ValidationException("EndDate must be later than or equal to StartDate.");
        }

        if (details.DaysOfWeek is < 0 or > 127)
        {
            throw new ValidationException("DaysOfWeek must contain only valid weekday flags.");
        }

        if (details.DayOfMonth is < 1 or > 31)
        {
            throw new ValidationException("DayOfMonth must be between 1 and 31.");
        }

        if (details.Frequency == RecurrenceFrequency.Weekly
            && (details.DaysOfWeek == null || details.DaysOfWeek == (int)WeeklyDayFlags.None))
        {
            throw new ValidationException("DaysOfWeek is required for weekly recurring tasks.");
        }

        if (details.Frequency != RecurrenceFrequency.Weekly && details.DaysOfWeek != null)
        {
            throw new ValidationException("DaysOfWeek can only be set for weekly recurring tasks.");
        }

        if (details.Frequency != RecurrenceFrequency.Monthly && details.DayOfMonth != null)
        {
            throw new ValidationException("DayOfMonth can only be set for monthly recurring tasks.");
        }
    }

    private static void ValidateTemplateDates(CreateRecurringTaskRequest details, DateTimeOffset templateEndTime)
    {
        if (DateOnly.FromDateTime(details.TemplateStartTime.Date) != details.StartDate)
        {
            throw new ValidationException("TemplateStartTime date must match StartDate.");
        }

        if (details.TimeType == TaskTimeType.RangeTime
            && DateOnly.FromDateTime(templateEndTime.Date) != details.StartDate)
        {
            throw new ValidationException("TemplateEndTime date must match StartDate.");
        }
    }

    private static RecurringDeadlineTemplate BuildDeadlineTemplate(
        CreateRecurringTaskRequest details,
        DateTimeOffset templateEndTime)
    {
        if (details.IsDeadline != true)
        {
            return new RecurringDeadlineTemplate(false, null, null, null);
        }

        var templateDueAt = details.TemplateDueAt ?? templateEndTime;
        if (templateDueAt < templateEndTime)
        {
            throw new ValidationException("TemplateDueAt cannot be before the task end time.");
        }

        var timeZoneId = ValidateTimeZoneId(details.DeadlineTimeZoneId, "DeadlineTimeZoneId");

        var deadlineOffsetDays =
            DateOnly.FromDateTime(templateDueAt.Date).DayNumber - details.StartDate.DayNumber;

        if (deadlineOffsetDays < 0)
        {
            throw new ValidationException("TemplateDueAt cannot be before StartDate.");
        }

        return new RecurringDeadlineTemplate(
            true,
            deadlineOffsetDays,
            TimeOnly.FromTimeSpan(templateDueAt.TimeOfDay),
            timeZoneId);
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
