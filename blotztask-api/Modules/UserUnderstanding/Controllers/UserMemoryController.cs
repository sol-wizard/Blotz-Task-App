using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.UserUnderstanding.Controllers;

/// <summary>What the AI remembers about the signed-in user. Users can only view and delete; the AI adds items.</summary>
[ApiController]
[Route("api/user-memories")]
[Authorize]
public class UserMemoryController(
    GetUserMemoriesQueryHandler getUserMemoriesQueryHandler,
    ForgetUserMemoryCommandHandler forgetUserMemoryCommandHandler,
    ClearUserMemoriesCommandHandler clearUserMemoriesCommandHandler) : ControllerBase
{
    [HttpGet]
    public async Task<List<UserMemoryDto>> GetUserMemories(CancellationToken ct) =>
        await getUserMemoriesQueryHandler.Handle(new GetUserMemoriesQuery { UserId = GetUserId() }, ct);

    [HttpDelete("{memoryId:guid}")]
    public async Task<IActionResult> DeleteUserMemory(Guid memoryId, CancellationToken ct)
    {
        var deleted = await forgetUserMemoryCommandHandler.Handle(
            new ForgetUserMemoryCommand { UserId = GetUserId(), MemoryId = memoryId }, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpDelete]
    public async Task<IActionResult> ClearUserMemories(CancellationToken ct)
    {
        await clearUserMemoriesCommandHandler.Handle(new ClearUserMemoriesCommand { UserId = GetUserId() }, ct);
        return NoContent();
    }

    private Guid GetUserId()
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        return userId;
    }
}
