using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class AddRecurringTaskCommand : IValidatableObject
{
    public Guid UserId { get; init; }

    [Required]
    public required string Title { get; init; }

    public string? Description { get; init; }

    [Required]
    [EnumDataType(typeof(TaskTimeType))]
    public required TaskTimeType TimeType { get; init; }

    public int? LabelId { get; init; }

    [Required]
    public required DateTimeOffset TemplateStartTime { get; init; }

    public DateTimeOffset? TemplateEndTime { get; init; }

    [Required]
    [EnumDataType(typeof(RecurrenceFrequency))]
    public required RecurrenceFrequency Frequency { get; init; }

    [Range(1, int.MaxValue)]
    public int Interval { get; init; } = 1;

    public int? DaysOfWeek { get; init; }

    public int? DayOfMonth { get; init; }

    [Required]
    public required DateOnly StartDate { get; init; }

    public DateOnly? EndDate { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult("Title is required.", new[] { nameof(Title) });

        if (EndDate.HasValue && EndDate.Value < StartDate)
            yield return new ValidationResult("EndDate must be greater than or equal to StartDate.", new[] { nameof(EndDate) });

        if (TimeType == TaskTimeType.SingleTime && TemplateEndTime.HasValue)
            yield return new ValidationResult("TemplateEndTime must be null for SingleTime.", new[] { nameof(TemplateEndTime) });

        if (TimeType == TaskTimeType.RangeTime && !TemplateEndTime.HasValue)
            yield return new ValidationResult("TemplateEndTime is required for RangeTime.", new[] { nameof(TemplateEndTime) });

        if (TemplateEndTime.HasValue && TemplateEndTime.Value < TemplateStartTime)
            yield return new ValidationResult("TemplateEndTime must be greater than or equal to TemplateStartTime.", new[] { nameof(TemplateEndTime) });

        if (Frequency == RecurrenceFrequency.Weekly && (!DaysOfWeek.HasValue || DaysOfWeek.Value == 0))
            yield return new ValidationResult("DaysOfWeek is required for weekly recurrence.", new[] { nameof(DaysOfWeek) });

        if (Frequency == RecurrenceFrequency.Monthly && DayOfMonth.HasValue && (DayOfMonth.Value < 1 || DayOfMonth.Value > 31))
            yield return new ValidationResult("DayOfMonth must be between 1 and 31.", new[] { nameof(DayOfMonth) });
    }
}

public class AddRecurringTaskCommandHandler(
    BlotzTaskDbContext db,
    ILogger<AddRecurringTaskCommandHandler> logger)
{
    public async Task<int> Handle(AddRecurringTaskCommand command, CancellationToken ct)
    {
        var title = command.Title.Trim();

        var recurringTask = new RecurringTask
        {
            UserId = command.UserId,
            Title = title,
            Description = command.Description,
            TimeType = command.TimeType,
            LabelId = command.LabelId,
            TemplateStartTime = command.TemplateStartTime,
            TemplateEndTime = command.TemplateEndTime,
            Pattern = new RecurrencePattern
            {
                Frequency = command.Frequency,
                Interval = command.Interval,
                DaysOfWeek = command.DaysOfWeek,
                DayOfMonth = command.DayOfMonth
            },
            StartDate = command.StartDate,
            EndDate = command.EndDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.RecurringTasks.Add(recurringTask);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "RecurringTask {RecurringTaskId} created for user {UserId}",
            recurringTask.Id,
            command.UserId);

        return recurringTask.Id;
    }
}