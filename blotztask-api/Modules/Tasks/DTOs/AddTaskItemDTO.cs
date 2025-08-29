using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.DTOs;

public class AddTaskItemDto
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public required string Title { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public int? LabelId { get; set; }
    public bool? HasTime { get; set; }
}
