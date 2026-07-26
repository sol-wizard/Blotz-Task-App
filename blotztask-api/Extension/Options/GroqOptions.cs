using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Extension.Options;

public sealed class GroqOptions
{
    // Must match the section name in appsettings.json. Change it here if you rename it there.
    public const string SectionName = "Groq";

    [Required]
    public string ApiKey { get; set; } = "";

    [Required]
    public string SpeechModel { get; set; } = "";

    [Required]
    public string Endpoint { get; set; } = "";
}
