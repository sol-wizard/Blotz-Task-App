namespace BlotzTask.Models;

public class PromptRequest
{
    public string Prompt { get; set; }
    public string TimeZoneId { get; set; } = "UTC";
}
