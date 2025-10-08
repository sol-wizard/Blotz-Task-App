using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Labels;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LabelController : ControllerBase
{
    private readonly GetAllLabelsQueryHandler _getAllLabelsQueryHandler;
    private readonly DeleteCustomLabelCommandHandler _deleteCustomLabelCommandHandler;
    public LabelController(GetAllLabelsQueryHandler getAllLabelsQueryHandler, 
        DeleteCustomLabelCommandHandler deleteCustomLabelCommandHandler)
    {
        _getAllLabelsQueryHandler = getAllLabelsQueryHandler;
        _deleteCustomLabelCommandHandler = deleteCustomLabelCommandHandler;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAllLabels(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetAllLabelsQuery { UserId = userId };
        var result = await _getAllLabelsQueryHandler.Handle(query, ct);
        return Ok(result);
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomLabel(int id,CancellationToken ct)
    {
        if(!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var command = new DeleteCustomLabelCommand
        { LabelId = id,
          UserId =  userId};
        var result = await _deleteCustomLabelCommandHandler.Handle(command,ct);
        return Ok(result);

    }
}