using System.ComponentModel.DataAnnotations.Schema;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class TaskDeadline
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    public int TaskItemId { get; set; }
    
    public DateTimeOffset DueAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public bool IsPinned { get; set; }
    
    public TaskItem TaskItem { get; set; } = null!;
}
