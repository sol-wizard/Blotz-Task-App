namespace BlotzTask.Models.GoalToTask
{
    public class GoalTasksWrapperDTO
{
    public List<ExtractedTaskDTO> Tasks { get; set; } = new();
    public string? Message { get; set; }
    public double ConfidenceScore { get; set; }
}

}