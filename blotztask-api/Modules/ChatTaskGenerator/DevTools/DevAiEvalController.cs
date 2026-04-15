using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

[ApiController]
public class DevAiEvalController(IAiEvalService evalService, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("dev/ai-test")]
    public async Task<IActionResult> TestGenerate([FromBody] DevAiTestRequest request, CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var result = await evalService.TestGenerateAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("dev/ai-eval")]
    public async Task<IActionResult> RunEval([FromQuery] string? caseId, CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var result = await evalService.RunEvalAsync(caseId, ct);

        return result switch
        {
            { NotFound: true } => NotFound(new { error = result.ErrorMessage }),
            _ => Ok(result.Scorecard)
        };
    }
}
