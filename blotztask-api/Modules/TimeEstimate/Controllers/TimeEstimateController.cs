using BlotzTask.Modules.TimeEstimate.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.TimeEstimate.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimeEstimateController(TimeEstimateCommandHandler timeEstimateCommandHandler) : ControllerBase
{
    [HttpPost]
    public async Task<TaskTimeEstimation> EstimateTaskTime([FromBody] FloatingTaskForEstimation floatingtask,
        CancellationToken ct)
    {
        var newTaskId = await timeEstimateCommandHandler.Handle(floatingtask, ct);
        return newTaskId;
    }
}