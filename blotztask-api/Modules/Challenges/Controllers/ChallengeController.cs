using BlotzTask.Modules.Challenges.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Challenges.Controllers;

[Authorize]
[ApiController]
[Route("api/challenges")]
public class ChallengeController(
    CreateChallengeCommandHandler createChallengeCommandHandler,
    JoinChallengeCommandHandler joinChallengeCommandHandler) : ControllerBase
{
    [HttpPost]
    public async Task<Guid> CreateChallenge([FromBody] CreateChallengeRequest request, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        return await createChallengeCommandHandler.Handle(new CreateChallengeCommand
        {
            UserId = userId,
            Name = request.Name
        }, ct);
    }

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> JoinChallenge(Guid id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        await joinChallengeCommandHandler.Handle(new JoinChallengeCommand
        {
            UserId = userId,
            ChallengeId = id
        }, ct);

        return Ok();
    }
}
