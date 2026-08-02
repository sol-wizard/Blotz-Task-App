using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.DTOs;
using BlotzTask.Modules.Referrals.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Referrals.Controllers;

[Authorize]
[ApiController]
[Route("api/referral")]
public class ReferralController(
    GetMyReferralCodeQueryHandler getMyReferralCodeQueryHandler,
    RedeemReferralCodeCommandHandler redeemReferralCodeCommandHandler) : ControllerBase
{
    [HttpGet("my-code")]
    public async Task<ReferralCodeDto> GetMyReferralCode(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        return await getMyReferralCodeQueryHandler.Handle(new GetMyReferralCodeQuery { UserId = userId }, ct);
    }

    [HttpPost("redeem")]
    public async Task<IActionResult> RedeemReferralCode([FromBody] RedeemReferralCodeRequest request, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        await redeemReferralCodeCommandHandler.Handle(new RedeemReferralCodeCommand
        {
            RefereeUserId = userId,
            Code = request.Code
        }, ct);
        return Ok();
    }
}
