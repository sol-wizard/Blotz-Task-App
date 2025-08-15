using BlotzTask.Modules.Labels.DTOs;

namespace BlotzTask.Shared.DTOs;

public class ExtractedTask
{
    public string Title { get; set; }

    public string Description { get; set; } = "";
    
    public string? EndTime { get; set; }
}