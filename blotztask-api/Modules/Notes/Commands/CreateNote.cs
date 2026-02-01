using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Notes.DTOs;

namespace BlotzTask.Modules.Notes.Commands;

public class CreateNoteCommand
{
  [Required] public Guid UserId { get; set; }
  [Required] public string Text { get; set; } = string.Empty;
}
public class CreateNoteCommandHandler(BlotzTaskDbContext db, ILogger<CreateNoteCommandHandler> logger)
{
  public async Task<NoteDto> Handle(CreateNoteCommand command, CancellationToken ct = default)
  {
    logger.LogInformation("Creating new note for user {UserId}", command.UserId);
    var text = (command.Text ?? string.Empty).Trim();
    if (string.IsNullOrWhiteSpace(text))
      throw new ArgumentException("text is required and trimmed");
    if (text.Length > 2000)
      throw new ArgumentException("Text max length is 2000");
    var utcNow = DateTime.UtcNow;
    var note = new Note
    {
      Id = Guid.NewGuid(),
      Text = text,
      CreatedAt = utcNow,
      UpdatedAt = utcNow,
      UserId = command.UserId
    };
    db.Notes.Add(note);
    await db.SaveChangesAsync(ct);
    logger.LogInformation("Note {NoteId} created for user {UserId}", note.Id, command.UserId);
    return new NoteDto
    {
      Id = note.Id,
      Text = note.Text,
      CreatedAt = note.CreatedAt,
      UpdatedAt = note.UpdatedAt,
    };
  }

}