namespace BlotzTask.Modules.Users.Domain;

public class UserPushToken
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public required string Token { get; set; }
    public required string DeviceId { get; set; }
    public DateTime UpdatedAt { get; set; }

    public AppUser User { get; set; } = null!;
}
