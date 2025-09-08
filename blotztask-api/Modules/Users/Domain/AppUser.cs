namespace BlotzTask.Modules.Users.Domain;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();  
    public required string Auth0UserId { get; set; }
    public required string Email { get; set; }
    public string? DisplayName { get; set; }
    public string? PictureUrl { get; set; }
}