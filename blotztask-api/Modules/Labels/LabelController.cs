using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController(AddLabelCommandHandler addlabelCommandHandler, GetAllLabelsQueryHandler getAlllabelsQueryHandler) : ControllerBase
{

    [HttpGet]
    public async Task<IActionResult> GetAllLabels(CancellationToken ct)
    {
        var result = await getAlllabelsQueryHandler.Handle(ct);
        return Ok(result);
    }
}