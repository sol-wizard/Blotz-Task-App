using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.SpeechToText.Dtos;

public class SpeechTranscribeRequest
{
    [FromForm(Name = "audio")]
    public IFormFile Audio { get; set; } = default!;

    // Forwarded as-is to Azure "definition" form field.
    [FromForm(Name = "definition")]
    public string? Definition { get; set; }
}
