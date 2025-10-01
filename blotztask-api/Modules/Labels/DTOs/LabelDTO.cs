using BlotzTask.Modules.Labels.Enums;

namespace BlotzTask.Modules.Labels.DTOs;

public class LabelDto
{
    public int LabelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public LabelScope Scope { get; set; }
    public Guid? UserId { get; set; }
}