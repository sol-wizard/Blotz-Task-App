using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Shared;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;


namespace BlotzTask.Modules.Notes.Commands;

public class ConvertNoteToTaskCommand
{
    [Required] public required Guid NoteId { get; init; }
    [Required] public required Guid UserId { get; init; }
    [Required] public required DateTimeOffset StartTime { get; init; }
    [Required] public required DateTimeOffset EndTime { get; init; }
}

public class ConvertNoteToTaskCommandHandler(
    BlotzTaskDbContext db,
    ILogger<ConvertNoteToTaskCommandHandler> logger)
{
    public async Task<int> Handle(ConvertNoteToTaskCommand command, CancellationToken ct = default)
    {
        logger.LogInformation(
            "Converting note {NoteId} to task for user {UserId}", command.NoteId, command.UserId
        );
        
        // Validate Time (Consistent with current task interface)
        TaskTimeValidator.ValidateTaskTimes(command.StartTime, command.EndTime, TaskTimeType.RangeTime);
        
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        
        // 1. search note using noteId + userId, not found -> 404
        var note = await db.Notes.FirstOrDefaultAsync(
            n => n.Id == command.NoteId && n.UserId == command.UserId,
            ct);

        if (note == null)
            throw new NotFoundException("Note not found or no permission.");

        var text = note.Text ?? string.Empty;
        
        // 2. Title/Description: if <=50, all as title;
        // if > 50 previous 50 as title, all as description
        string title;
        string? description;
        if (text.Length <= 50)
        {
            title = text;
            description = null;
        }
        else
        {
            title = text.Substring(0, 50);
            description = text;
        }
        
        // 3. create a new task Item
        var newTask = new TaskItem
        {
            Title = title,
            Description = description,
            StartTime = command.StartTime,
            EndTime = command.EndTime,
            TimeType = TaskTimeType.RangeTime,
            LabelId = null,
            UserId = command.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.TaskItems.Add(newTask);
        await db.SaveChangesAsync(ct);
        
        // 4. delete original note
        db.Notes.Remove(note);
        await db.SaveChangesAsync(ct);
        
        await transaction.CommitAsync(ct);
        
        logger.LogInformation("Converted note {NoteId} to task {TaskId} for user {UserId}", 
            command.NoteId, 
            newTask.Id, 
            command.UserId);

        return newTask.Id;
    }
}