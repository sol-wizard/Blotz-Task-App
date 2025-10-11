using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Labels.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController(
    GetAllLabelsQueryHandler getAllLabelsQueryHandler,
    GetLabelTaskCountQueryHandler getLabelTaskCountQueryHandler, CreateCustomLabelCommandHandler createCustomLabelCommandHandler) : ControllerBase
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

    [HttpPost("custom")]
    public async Task<IActionResult> CreateCustomLabel([FromBody] CreateCustomLabelCommand request,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new CreateCustomLabelCommand
        {
            UserId = userId,
            Name = request.Name,
            Color = request.Color,
            Description = request.Description
        };

        var result = await createCustomLabelCommandHandler.Handle(command, ct);

        return Ok(result);
    }
}