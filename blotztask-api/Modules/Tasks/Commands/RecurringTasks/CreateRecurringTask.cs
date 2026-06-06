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
    public required RecurrenceFrequency Frequency { get; init; }
    public int Interval { get; init; } = 1;
    public int? DaysOfWeek { get; init; }
    public int? DayOfMonth { get; init; }
    public required DateOnly StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
}

public class CreateRecurringTaskCommand
{
    public required Guid UserId { get; init; }
    public required CreateRecurringTaskRequest TaskDetails { get; init; }
}

public class CreateRecurringTaskCommandHandler(
    BlotzTaskDbContext db,
    ILogger<CreateRecurringTaskCommandHandler> logger)
{
    public async Task<int> Handle(CreateRecurringTaskCommand command, CancellationToken ct = default)
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
        ValidateRecurrence(details);

        var now = DateTime.UtcNow;
        var recurringTask = new RecurringTask
        {
            UserId = command.UserId,
            Title = title,
            Description = string.IsNullOrWhiteSpace(details.Description)
                ? null
                : details.Description.Trim(),
            TimeType = details.TimeType,
            LabelId = details.LabelId,
            TemplateStartTime = details.TemplateStartTime,
            TemplateEndTime = details.TimeType == TaskTimeType.SingleTime ? null : details.TemplateEndTime,
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

        logger.LogInformation(
            "RecurringTask {RecurringTaskId} was successfully created for user {UserId}",
            recurringTask.Id,
            command.UserId);

        return recurringTask.Id;
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
}
