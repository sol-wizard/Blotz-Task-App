using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class RecurringTaskSeries
{
    public int Id { get; set; }
    public required Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<RecurringTask> Versions { get; set; } = new List<RecurringTask>();
    public ICollection<RecurringOccurrenceOverride> Overrides { get; set; } = new List<RecurringOccurrenceOverride>();
}
