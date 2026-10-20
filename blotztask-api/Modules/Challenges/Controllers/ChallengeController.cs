using BlotzTask.Modules.Challenges.Commands;
using BlotzTask.Modules.Challenges.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Challenges.Controllers;

[Authorize]
[ApiController]
[Route("api/challenges")]
public class ChallengeController(
    CreateChallengeCommandHandler createChallengeCommandHandler,
    JoinChallengeCommandHandler joinChallengeCommandHandler,
    GetCurrentChallengeQueryHandler getCurrentChallengeQueryHandler,
    GetChallengeHistoryQueryHandler getChallengeHistoryQueryHandler) : ControllerBase
{
    [HttpGet("history")]
    public async Task<List<ChallengeHistoryItemDto>> GetChallengeHistory(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        return await getChallengeHistoryQueryHandler.Handle(new GetChallengeHistoryQuery { UserId = userId }, ct);
    }

    // 204 No Content when the user isn't in an unfinished challenge.
    [HttpGet("current")]
    public async Task<CurrentChallengeDto?> GetCurrentChallenge(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        return await getCurrentChallengeQueryHandler.Handle(new GetCurrentChallengeQuery { UserId = userId }, ct);
    }

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
