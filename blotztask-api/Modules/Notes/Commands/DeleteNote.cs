using System.ComponentModel.DataAnnotations;
using System.Data;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
namespace BlotzTask.Modules.Notes.Commands;

public class DeleteNoteCommand
{
  [Required] public required Guid NoteId { get; set; }
  [Required] public required Guid UserId { get; set; }
}
public class DeleteNoteCommandHandler(BlotzTaskDbContext db, ILogger<DeleteNoteCommandHandler> logger)
{
  public async Task Handle(DeleteNoteCommand command, CancellationToken ct = default)
  {
    logger.LogInformation("Deleting note {NoteId} for user {UserId}", command.NoteId, command.UserId);
    var note = await db.Notes
      .FirstOrDefaultAsync(n => n.Id == command.NoteId && n.UserId == command.UserId);
    if (note == null)
      throw new NotFoundException("Note not found or no permission.");
    db.Notes.Remove(note);
    await db.SaveChangesAsync(ct);
    logger.LogInformation("Deleted note {NoteId} for user {UserId}", command.NoteId, command.UserId);
  }

}