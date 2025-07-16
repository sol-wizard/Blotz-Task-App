namespace BlotzTask.Modules.Labels.DTOs;

public class LabelDto
{
    public int LabelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}