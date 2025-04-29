namespace BlotzTask.Application.Labels.Models;

public class LabelDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Color { get; set; }
    public required string Description { get; set; }
}