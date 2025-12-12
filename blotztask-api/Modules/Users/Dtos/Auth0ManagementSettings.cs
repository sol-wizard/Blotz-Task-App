namespace BlotzTask.Modules.Users.Dtos;

public class Auth0ManagementSettings
{
    public string Domain { get; set; } = default!;
    public string ClientId { get; set; } = default!;
    public string ClientSecret { get; set; } = default!;
    public string Audience { get; set; } = default!;
}