using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class TaskDeadline
{
    public int Id { get; set; }
    
    public int TaskItemId { get; set; }
    
    public required DateTimeOffset DueAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public bool IsPinned { get; set; } = false;
    
    public required TaskItem TaskItem { get; set; }
}
