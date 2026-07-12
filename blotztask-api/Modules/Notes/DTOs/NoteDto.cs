namespace BlotzTask.Modules.Notes.DTOs;

public class NoteDto
{
  public Guid Id { get; set; }
  public string Text { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
  public bool IsPersistent { get; set; }

}
