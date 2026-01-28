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
    public async Task<NoteTimeEstimation> EstimateNoteTime([FromBody] NoteForEstimation note,
        CancellationToken ct)
    {
        var newNoteId = await timeEstimateCommandHandler.Handle(note, ct);
        return newNoteId;
    }
}