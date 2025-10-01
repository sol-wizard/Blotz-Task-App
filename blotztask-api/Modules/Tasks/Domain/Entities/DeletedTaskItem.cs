using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class DeletedTaskItem
{
    [DatabaseGenerated(DatabaseGeneratedOption.None)] // Keep the original TaskItem ID
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public TaskTimeType? TimeType { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime DeletedAt { get; set; } // Track when it was deleted
    public required Guid UserId { get; set; }
    [ForeignKey("UserId")]
    public AppUser? User { get; set; }
    public int? LabelId { get; set; }
    [ForeignKey("LabelId")]
    public Label? Label { get; set; }
}