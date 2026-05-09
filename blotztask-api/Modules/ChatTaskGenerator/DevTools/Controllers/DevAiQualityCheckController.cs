using Microsoft.AspNetCore.Mvc;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

[ApiController]
public class DevAiQualityCheckController(
    IAiQualityCheckService qualityCheckService,
    IWebHostEnvironment env,
    BlotzTaskDbContext dbContext,
    IConfiguration configuration) : ControllerBase
{
    private const string DevQualityCheckUserEmailEnvKey = "AiQualityCheck:UserEmail";

    [HttpPost("dev/ai-quality-check")]
    public async Task<IActionResult> RunQualityCheck(
        [FromBody] QualityCheckRequest request,
        [FromQuery] string? caseId,
        CancellationToken ct)
    {
        if (!env.IsDevelopment())
            throw new NotFoundException("AI quality check is only available in development.");

        var devUserEmail = configuration[DevQualityCheckUserEmailEnvKey];
        if (string.IsNullOrWhiteSpace(devUserEmail))
            throw new NotFoundException($"Missing environment variable: {DevQualityCheckUserEmailEnvKey}");

        var userId = await dbContext.AppUsers
            .Where(u => u.Email == devUserEmail)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(ct);

        if (userId == Guid.Empty)
            throw new NotFoundException($"No user found for email '{devUserEmail}' from {DevQualityCheckUserEmailEnvKey}");

        var result = await qualityCheckService.RunQualityCheckAsync(request, caseId, userId, ct);

        if (result.IsError)
            throw new NotFoundException(result.ErrorMessage);

        return Ok(result.Scorecard);
    }
}
