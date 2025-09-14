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
        var result = await getAllLabelsQueryHandler.Handle(ct);
        return Ok(result);
    }
}