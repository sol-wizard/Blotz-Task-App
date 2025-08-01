namespace BlotzTask.Modules.Users.DTOs;

public class UserInfoDto
{
    public string Username { get; set; } = string.Empty;
    public string Firstname { get; set; } = string.Empty;
    public string Lastname { get; set; } = string.Empty;
    public string Email {get; set;} = string.Empty;

    public string Message {get; set;} = string.Empty;
}