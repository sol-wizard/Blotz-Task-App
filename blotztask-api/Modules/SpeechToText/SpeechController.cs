using BlotzTask.Modules.SpeechToText.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

[ApiController]
[Route("api/speech")]
public class SpeechController : ControllerBase
{
    private readonly SpeechTokenSettings _settings;
    private readonly SpeechTokenService _speech;

    public SpeechController(SpeechTokenService speech, IOptions<SpeechTokenSettings> settings)
    {
        _speech = speech;
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
            expiresInSeconds = 600
        });
    }
}