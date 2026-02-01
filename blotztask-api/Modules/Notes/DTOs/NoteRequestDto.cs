using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Notes.DTOs;

public class NoteRequestDto
{
  [Required] public string Text { get; set; } = string.Empty;
}