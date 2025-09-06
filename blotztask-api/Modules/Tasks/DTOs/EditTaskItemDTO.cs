using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.DTOs;

public class EditTaskItemDto
{
    public int Id { get; set; }
    [Required]
    [StringLength(200, ErrorMessage = "Title cannot be longer than 200 characters.")]
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public int LabelId { get; set; }
    public bool? HasTime { get; set; }
}