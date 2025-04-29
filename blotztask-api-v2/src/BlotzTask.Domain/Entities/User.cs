namespace BlotzTask.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public required string IdentityUserId { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();
}