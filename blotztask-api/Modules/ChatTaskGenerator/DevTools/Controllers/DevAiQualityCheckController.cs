using Microsoft.AspNetCore.Mvc;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

[ApiController]
public class DevAiQualityCheckController(
    IAiQualityCheckService qualityCheckService,
    IWebHostEnvironment env,
    BlotzTaskDbContext dbContext,
    IConfiguration configuration) : ControllerBase
{
    private const string DevQualityCheckUserEmailEnvKey = "DEV_QUALITY_CHECK_USER_EMAIL";

    [HttpPost("dev/ai-quality-check")]
    public async Task<IActionResult> RunQualityCheck(
        [FromBody] QualityCheckRequest request,
        [FromQuery] string? caseId,
        CancellationToken ct)
    {
        //Should do this better not in the controller maybe some where else and retrun a proper error
        if (!env.IsDevelopment())
            return NotFound();

        var devUserEmail = configuration[DevQualityCheckUserEmailEnvKey];
        if (string.IsNullOrWhiteSpace(devUserEmail))
            return NotFound(new { error = $"Missing environment variable: {DevQualityCheckUserEmailEnvKey}" });

        var userId = await dbContext.AppUsers
            .Where(u => u.Email == devUserEmail)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(ct);

        if (userId == Guid.Empty)
            return NotFound(new { error = $"No user found for email '{devUserEmail}' from {DevQualityCheckUserEmailEnvKey}" });

        var result = await qualityCheckService.RunQualityCheckAsync(request, caseId, userId, ct);

        return result switch
        {
            { IsError: true } => NotFound(new { error = result.ErrorMessage }),
            _ => Ok(result.Scorecard)
        };
    }
}
