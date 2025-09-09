namespace BlotzTask.Shared.DTOs;

public class Auth0Settings
{
    public string Authority { get; set; } = default!;
    public string Audience  { get; set; } = default!;
}