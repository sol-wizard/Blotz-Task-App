using BlotzTask.Modules.Reviews.Enums;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Reviews.Domain;

public class ReviewReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public ReviewPeriodType PeriodType { get; set; }

    // Half-open period [PeriodStartUtc, PeriodEndUtc) — a task belongs to the report when
    // its date is >= start and < end, so boundary values are never double-counted.
    public DateTimeOffset PeriodStartUtc { get; set; }
    public DateTimeOffset PeriodEndUtc { get; set; }

    public string AiGeneratedLetter { get; set; } = string.Empty;
    public string AiInputJson { get; set; } = string.Empty;
    public int? AiInputTaskCount { get; set; }
    public string AiModel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public AppUser? User { get; set; }
}
