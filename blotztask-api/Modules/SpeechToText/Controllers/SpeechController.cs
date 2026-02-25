using BlotzTask.Modules.SpeechToText.Dtos;
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
    public async Task<IActionResult> Transcribe([FromForm] SpeechTranscribeRequest request, CancellationToken ct)
    {
        if (request.Audio is null) throw new ArgumentException("audio is required.");

        var result = await _speech.TranscribeAsync(request.Audio, request.Definition, ct);
        return Ok(result);
    }
}
