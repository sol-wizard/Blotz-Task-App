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
    private readonly TaskGenerationAiService _aiService;
    private readonly BreakdownService _breakdownService;

    public AiTaskController(TaskGenerationAiService aiService, BreakdownService breakdownService)
    {
        _aiService = aiService;
        _breakdownService = breakdownService;
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
   
    [HttpPost("todos/breakdown")]
    public async Task<IActionResult> BreakdownGoal([FromBody] BreakdownRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.Title) || string.IsNullOrWhiteSpace(request?.Description))
        {
            return BadRequest("Title and Description are required.");
        }

        var response = await _breakdownService.BreakdownTodoAsync(request.Title, request.Description, cancellationToken);

        return Ok(new { Response = response });
    }
}
