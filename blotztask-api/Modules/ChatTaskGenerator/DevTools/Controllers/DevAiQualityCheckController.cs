using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

[ApiController]
public class DevAiQualityCheckController(IAiQualityCheckService qualityCheckService, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("dev/ai-quality-check")]
    public async Task<IActionResult> RunQualityCheck([FromQuery] string? caseId, CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var result = await qualityCheckService.RunQualityCheckAsync(caseId, ct);

        return result switch
        {
            { NotFound: true } => NotFound(new { error = result.ErrorMessage }),
            _ => Ok(result.Scorecard)
        };
    }
}
