
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.DTOs;

public class ExtractedTasksWrapperDto
{
    public List<ExtractedTaskDto> Tasks { get; set; } = new();
    public string? Message { get; set; }
}