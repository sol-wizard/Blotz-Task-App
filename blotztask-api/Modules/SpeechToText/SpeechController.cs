using BlotzTask.Modules.SpeechToText.Dtos;
using BlotzTask.Modules.SpeechToText.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

[ApiController]
[Route("api/speech")]
[Authorize]
public class SpeechController : ControllerBase
{
    private readonly SpeechTokenSettings _settings;
    private readonly SpeechTokenService _speech;
    private readonly IFastTranscriptionService _fastTranscriptionService;

    public SpeechController(
        SpeechTokenService speech,
        IFastTranscriptionService fastTranscriptionService,
        IOptions<SpeechTokenSettings> settings)
    {
        _speech = speech;
        _fastTranscriptionService = fastTranscriptionService;
        _settings = settings.Value;
    }


    [HttpGet("token")]
    public async Task<IActionResult> GetToken(CancellationToken ct)
    {
        var token = await _speech.GetTokenAsync(ct);

        return Ok(new
        {
            token,
            region = _settings.Region,
        });
    }

    [HttpPost("fast-transcribe")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> FastTranscribe([FromForm(Name = "audio")] IFormFile wavFile, CancellationToken ct)
    {
        if (wavFile == null || wavFile.Length == 0)
            return BadRequest("A WAV file is required in form field 'audio'.");

        var text = await _fastTranscriptionService.FastTranscribeWavAsync(wavFile, ct);

        return Ok(new { text });
    }
}
