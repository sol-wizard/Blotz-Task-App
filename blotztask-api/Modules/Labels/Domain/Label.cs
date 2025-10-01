using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Labels.Enums;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Labels.Domain;

public class Label
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int LabelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public LabelScope Scope { get; set; }
    public AppUser? User { get; set; }
    public Guid? UserId { get; set; }
    public ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();
}