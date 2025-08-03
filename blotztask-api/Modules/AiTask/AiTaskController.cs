using BlotzTask.Modules.AiTask.DTOs;
using BlotzTask.Modules.AiTask.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.AiTask;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AiTaskController : ControllerBase
{
    private readonly AiTaskGenerationService _aiTaskGenerationService;
    private readonly AiBreakdownService _aiBreakdownService;

    public AiTaskController(AiTaskGenerationService aiTaskGenerationService, AiBreakdownService aiBreakdownService)
    {
        _aiTaskGenerationService = aiTaskGenerationService;
        _aiBreakdownService = aiBreakdownService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateFromPrompt([FromBody] PromptRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.Prompt))
        {
            return BadRequest("Prompt cannot be empty.");
        }

        var response = await _aiTaskGenerationService.GenerateResponseAsync(request.Prompt, request.TimeZoneId, cancellationToken);
        return Ok(new { Response = response });
    }
   
    [HttpPost("todos/breakdown")]
    public async Task<IActionResult> BreakdownGoal([FromBody] AiBreakdownTaskInputDto originalTask, CancellationToken cancellationToken)
    {
        var response = await _aiBreakdownService.BreakdownTaskAsync(originalTask, cancellationToken);

        return Ok(new { Response = response });
    }
}
