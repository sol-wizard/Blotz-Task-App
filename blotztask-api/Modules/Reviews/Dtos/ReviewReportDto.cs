using BlotzTask.Modules.Reviews.Enums;

namespace BlotzTask.Modules.Reviews.Dtos;

public class ReviewReportDto
{
    public ReviewPeriodType PeriodType { get; set; }
    public DateTimeOffset PeriodStartUtc { get; set; }
    public DateTimeOffset PeriodEndUtc { get; set; }
    public string AiGeneratedLetter { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsLowActivity { get; set; }
}

public class ReviewTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTimeOffset PlannedDate { get; set; }
    public DateTimeOffset? CompletedDate { get; set; }
    public int PlannedDurationMinutes { get; set; }
    public bool IsDone { get; set; }
}
