using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

[ApiController]
public class DevAiQualityCheckController(IAiQualityCheckService qualityCheckService, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("dev/ai-quality-check")]
    public async Task<IActionResult> RunQualityCheck(
        [FromBody] QualityCheckRequest request,
        [FromQuery] string? caseId,
        CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var result = await qualityCheckService.RunQualityCheckAsync(request, caseId, ct);

        return result switch
        {
            { IsError: true } => NotFound(new { error = result.ErrorMessage }),
            _ => Ok(result.Scorecard)
        };
    }
}
