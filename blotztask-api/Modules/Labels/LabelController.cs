using BlotzTask.Modules.Labels.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController(GetAllLabelsQueryHandler getAllLabelsQueryHandler) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAllLabels(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetAllLabelsQuery { UserId = userId };
        var result = await getAllLabelsQueryHandler.Handle(query, ct);
        return Ok(result);
    }
}