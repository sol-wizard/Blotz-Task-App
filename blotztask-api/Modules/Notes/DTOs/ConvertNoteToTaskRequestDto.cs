using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Notes.DTOs;

public class ConvertNoteToTaskRequestDto
{
    [Required]
    public required DateTimeOffset StartTime { get; set; }
    
    [Required]
    public required DateTimeOffset EndTime { get; set; }
}