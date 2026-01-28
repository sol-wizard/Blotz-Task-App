using System.ComponentModel.DataAnnotations;
using System.Data;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Notes.Commands;

public class UpdateNoteCommand
{
  [Required] public required Guid NoteId { get; set; }
  [Required] public required string Text { get; set; }
  [Required] public required Guid UserId { get; set; }

}
public class UpdateNoteCommandHandler(BlotzTaskDbContext db, ILogger<UpdateNoteCommandHandler> logger)
{
  public async Task<NoteDto> Handle(UpdateNoteCommand command, CancellationToken ct = default)
  {
    logger.LogInformation("Updating note {Id} for user {UserId}", command.NoteId, command.UserId);
    var note = await db.Notes
        .FirstOrDefaultAsync(n => n.Id == command.NoteId && n.UserId == command.UserId);
    if (note == null)
      throw new NotFoundException("Note not found or no permission");
    var text = (command.Text ?? string.Empty).Trim();
    if (string.IsNullOrWhiteSpace(text))
      throw new ArgumentException("Text is required.");
    if (text.Length > 2000)
      throw new ArgumentException("Text max length is 2000");
    note.Text = text;
    note.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return new NoteDto
    {
      Id = note.Id,
      Text = note.Text,
      CreatedAt = note.CreatedAt,
      UpdatedAt = note.UpdatedAt
    };
  }
}