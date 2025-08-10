using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class Subtask
{
    public int Id { get; set; }
    public int ParentTaskId { get; set; }  // FK -> TaskItem.Id
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public TimeSpan? Duration { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public TaskItem ParentTask { get; set; } = default!;
}
