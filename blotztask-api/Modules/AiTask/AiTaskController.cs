using BlotzTask.Modules.AiTask.DTOs;
using BlotzTask.Modules.AiTask.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.AiTask;

[Authorize]
[ApiController]
[Obsolete]
[Route("api/[controller]")]
public class AiTaskController : ControllerBase
{
    private readonly TaskGenerationAiService _aiService;

    public AiTaskController(TaskGenerationAiService aiService)
    {
        _aiService = aiService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateFromPrompt([FromBody] PromptRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.Prompt))
        {
            return BadRequest("Prompt cannot be empty.");
        }

        var response = await _aiService.GenerateResponseAsync(request.Prompt, request.TimeZoneId, cancellationToken);
        return Ok(new { Response = response });
    }
   
}
