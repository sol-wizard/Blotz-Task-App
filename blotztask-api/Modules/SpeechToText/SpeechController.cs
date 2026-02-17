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
    private readonly IFastTranscriptionService _fastTranscriptionService;
    private readonly SpeechTokenSettings _settings;
    private readonly SpeechTokenService _speech;

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
            region = _settings.Region
        });
    }

    [HttpPost("fast-transcribe")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> FastTranscribe([FromForm(Name = "audio")] IFormFile wavFile,
        [FromQuery] string conversationId, CancellationToken ct)
    {
        if (wavFile == null || wavFile.Length == 0)
            return BadRequest("A WAV file is required in form field 'audio'.");

        var fastTranscriptionRequest = new FastTranscriptionRequest
        {
            wavFile = wavFile,
            conversationId = conversationId
        };

        var text = await _fastTranscriptionService.FastTranscribeWavAsync(fastTranscriptionRequest, ct);

        return Ok(new { text });
    }
}