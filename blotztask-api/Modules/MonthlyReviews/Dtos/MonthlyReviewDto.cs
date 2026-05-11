namespace BlotzTask.Modules.MonthlyReviews.Dtos;

public class MonthlyReviewDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string AiGeneratedLetter { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class MonthlyReviewTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public DateTimeOffset PlannedDate { get; set; }
    public int TimeTakenMinutes { get; set; }
    public bool IsDone { get; set; }
}
