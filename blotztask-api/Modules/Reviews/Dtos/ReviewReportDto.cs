using BlotzTask.Modules.Reviews.Enums;

namespace BlotzTask.Modules.Reviews.Dtos;

public class ReviewReportDto
{
    public ReviewPeriodType PeriodType { get; set; }

    // Date-only local calendar bounds the client displays and navigates by.
    public DateOnly PeriodStartLocal { get; set; }
    public DateOnly PeriodEndLocalExclusive { get; set; }

    // Null until the review has been generated.
    public string? Letter { get; set; }
    public bool IsLowActivity { get; set; }
    public DateTime? GeneratedAtUtc { get; set; }
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
