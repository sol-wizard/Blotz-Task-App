//request dto
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.SpeechToText.Dtos;

public class SpeechTranscribeRequest
{
    [FromForm(Name = "audio")]
    public IFormFile Audio { get; set; } = default!;
}