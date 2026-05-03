using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class SaveRecurringOccurrenceCommand
{
    public required int RecurringTaskId { get; init; }
    public required DateOnly OccurrenceDate { get; init; }
}

public class SaveRecurringOccurrenceCommandHandler(
    BlotzTaskDbContext db,
    RecurringTaskGeneratorService generatorService,
    ILogger<SaveRecurringOccurrenceCommandHandler> logger)
{
    public async Task<int> Handle(SaveRecurringOccurrenceCommand command, CancellationToken ct)
    {
        var template = await db.RecurringTasks
            .FirstOrDefaultAsync(r => r.Id == command.RecurringTaskId, ct);

        if (template == null)
            throw new NotFoundException($"RecurringTask {command.RecurringTaskId} not found.");


        // Check if a row already exists for this (RecurringTaskId, date) — avoid duplicates.
        // Use the exact StartTime value that CreateTaskItem would produce for idempotency.
        var expectedStartTime = new DateTimeOffset(
            command.OccurrenceDate,
            TimeOnly.FromTimeSpan(template.TemplateStartTime.TimeOfDay),
            template.TemplateStartTime.Offset);

        var existingId = await db.TaskItems
            .Where(t => t.RecurringTaskId == command.RecurringTaskId
                        && t.StartTime == expectedStartTime)
            .Select(t => (int?)t.Id)
            .FirstOrDefaultAsync(ct);

        if (existingId.HasValue)
        {
            logger.LogInformation(
                "Occurrence for RecurringTask {RecurringTaskId} on {Date} already exists as TaskItem {TaskItemId}",
                command.RecurringTaskId, command.OccurrenceDate, existingId.Value);
            return existingId.Value;
        }

        var taskItem = RecurringTaskGeneratorService.CreateTaskItem(template, command.OccurrenceDate);
        taskItem.IsDone = true;

        db.TaskItems.Add(taskItem);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Saved occurrence for RecurringTask {RecurringTaskId} on {Date} as TaskItem {TaskItemId}",
            command.RecurringTaskId, command.OccurrenceDate, taskItem.Id);

        return taskItem.Id;
    }
}