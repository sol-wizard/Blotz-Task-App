using BlotzTask.Modules.AiUsage.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BlotzTask.Modules.AiUsage.Controllers;


[ApiController]
[Route("api/ai-usage")]
[Authorize]
public class AiUsageController(GetAiUsageSummaryQueryHandler getAiUsageSummaryQueryHandler):ControllerBase
{
    [HttpGet]
    public async Task<AiUsageSummaryDto> GetUsage(CancellationToken ct)
    {
        if(!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var query = new GetAiUsageSummaryQuery{UserId = userId};
        return await getAiUsageSummaryQueryHandler.Handle(query, ct);
    }
}