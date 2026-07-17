using BlotzTask.Modules.Invites.Commands;
using BlotzTask.Modules.Invites.DTOs;
using BlotzTask.Modules.Invites.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Invites.Controllers;

[Authorize]
[ApiController]
[Route("api/invite")]
public class InviteController(
    GetMyInviteCodeQueryHandler getMyInviteCodeQueryHandler,
    RedeemInviteCodeCommandHandler redeemInviteCodeCommandHandler) : ControllerBase
{
    [HttpGet("my-code")]
    public async Task<InviteCodeDto> GetMyInviteCode(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        return await getMyInviteCodeQueryHandler.Handle(new GetMyInviteCodeQuery { UserId = userId }, ct);
    }

    [HttpPost("redeem")]
    public async Task<IActionResult> RedeemInviteCode([FromBody] RedeemInviteCodeRequest request, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        await redeemInviteCodeCommandHandler.Handle(new RedeemInviteCodeCommand
        {
            RedeemerId = userId,
            Code = request.Code
        }, ct);
        return Ok();
    }
}
