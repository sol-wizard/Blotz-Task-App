using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.MonthlyReviews.Domain;

public class MonthlyReviewReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string AiGeneratedLetter { get; set; } = string.Empty;
    public string AiInputJson { get; set; } = string.Empty;
    public string AiModel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public AppUser? User { get; set; }
}
