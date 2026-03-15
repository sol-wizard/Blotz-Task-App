using BlotzTask.Modules.Tasks.Queries.Deadlines;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Tasks.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class DeadlineController(
    GetAllDdlTasksQueryHandler getAllDdlTasksQueryHandler,
    ILogger<DeadlineController> logger
) : ControllerBase
{
    private readonly ILogger<DeadlineController> _logger = logger;

    [HttpGet("all")]
    public async Task<IEnumerable<DeadlineTaskDto>> GetAllDdlTasks(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetAllDdlTasksQuery { UserId = userId };
        return await getAllDdlTasksQueryHandler.Handle(query, ct);
    }

}
