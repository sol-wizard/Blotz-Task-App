namespace BlotzTask.Modules.DailyReminderGenerator.Dtos;

public class ReminderResult
{
    public int? TaskId { get; set; }
    public string? ReminderText { get; set; }
    public double? ConfidenceScore { get; set; }
}