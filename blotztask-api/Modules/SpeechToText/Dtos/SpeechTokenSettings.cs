namespace BlotzTask.Modules.SpeechToText.Dtos;

public class SpeechTokenSettings
{
    public string? Endpoint { get; set; }
    public string Region { get; set; } = default!;
    public string Key { get; set; } = default!;
    public string ApiVersion { get; set; } = "2025-10-15";
}
