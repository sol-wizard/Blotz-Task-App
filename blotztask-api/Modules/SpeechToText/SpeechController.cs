using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/speech")]
public class SpeechController : ControllerBase
{
    private readonly SpeechTokenService _speech;

    public SpeechController(SpeechTokenService speech)
    {
        _speech = speech;
    }

    // 建议加 [Authorize]（看你项目是否需要登录后才能用 STT）
    [HttpGet("token")]
    public async Task<IActionResult> GetToken(CancellationToken ct)
    {
        var token = await _speech.GetTokenAsync(ct);

        return Ok(new
        {
            token,
            region = _speech.Region,
            // 前端可用来判断什么时候刷新
            expiresInSeconds = 600
        });
    }
}