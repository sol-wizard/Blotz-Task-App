// controller
using BlotzTask.Modules.SpeechToText.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/speech")]
[Authorize]
public class SpeechController : ControllerBase
{
    private readonly SpeechTranscriptionService _speech;

    public SpeechController(SpeechTranscriptionService speech)
    {
        _speech = speech;
    }


    [HttpPost("transcribe")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Transcribe(IFormFile audio, CancellationToken ct)
    {
        if (audio is null) throw new ArgumentException("audio is required.");

        var result = await _speech.TranscribeAsync(audio, ct);
        return Ok(result);
    }
}