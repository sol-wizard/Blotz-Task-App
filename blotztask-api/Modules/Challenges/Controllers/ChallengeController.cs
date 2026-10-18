using BlotzTask.Modules.Challenges.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Challenges.Controllers;

[Authorize]
[ApiController]
[Route("api/challenges")]
public class ChallengeController(CreateChallengeCommandHandler createChallengeCommandHandler) : ControllerBase
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
}
