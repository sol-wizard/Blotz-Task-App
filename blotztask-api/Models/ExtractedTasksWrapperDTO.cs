
namespace BlotzTask.Models

{
    public class ExtractedTasksWrapperDTO
{
    public List<ExtractedTaskDTO> Tasks { get; set; } = new();
    public string? Message { get; set; }
}

}