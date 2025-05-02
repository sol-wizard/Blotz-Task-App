namespace BlotzTask.Models
{
    public class GoalToTasksRequest
    {
        public string Goal { get; set; }
        public int DurationInDays { get; set; }
        public string TimeZoneId { get; set; } = "UTC";
    }
}
