using BlotzTask.Modules.AiUsage.Queries;
using Microsoft.AspNetCore.Authorization;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;
namespace BlotzTask.Modules.AiUsage.Controllers;


[ApiController]
[Route("api/ai-usage")]
[Authorize]
public class AiUsageController(GetAiUsageSummaryQueryHandler getAiUsageSummaryQueryHandler) : AuthorizedControllerBase
{
    [HttpGet]
    public async Task<AiUsageSummaryDto> GetUsage(CancellationToken ct)
    {
        var userId = UserId;
        var query = new GetAiUsageSummaryQuery{UserId = userId};
        return await getAiUsageSummaryQueryHandler.Handle(query, ct);
    }
}