using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Labels.Queries;
using BlotzTask.Modules.Labels.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController(
    GetAllLabelsQueryHandler getAllLabelsQueryHandler,
    GetLabelTaskCountQueryHandler getLabelTaskCountQueryHandler,
    AddCustomLabelCommandHandler addCustomLabelCommandHandler,
    DeleteCustomLabelCommandHandler deleteCustomLabelCommandHandler
) : ControllerBase
{

    [HttpGet]
    public async Task<List<LabelDTO>> GetAllLabels(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetAllLabelsQuery { UserId = userId };
        return await getAllLabelsQueryHandler.Handle(query, ct);
    }

    [HttpGet("{labelId}/task-count")]
    public async Task<LabelTaskCountDto> GetLabelTaskCount(int labelId, CancellationToken ct)
    {
        var query = new GetLabelTaskCountQuery { LabelId = labelId };
        return await getLabelTaskCountQueryHandler.Handle(query, ct);
    }

    [HttpPost]
    public async Task<IActionResult> AddCustomLabel([FromBody] AddCustomLabelCommand request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new AddCustomLabelCommand
        {
            UserId = userId,
            Name = request.Name,
            Color = request.Color,
            Description = request.Description
        };

        var result = await addCustomLabelCommandHandler.Handle(command, ct);

        return Ok(result);
    }
    
    [HttpDelete("{id}")]
    public async Task<string> DeleteCustomLabel(int id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var command = new DeleteCustomLabelCommand
        {
            LabelId = id,
            UserId = userId
        };
        return await deleteCustomLabelCommandHandler.Handle(command, ct);

    }

}

