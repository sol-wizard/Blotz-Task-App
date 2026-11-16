using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.DTOs;
using BlotzTask.Modules.Referrals.Events;
using BlotzTask.Modules.Referrals.Queries;
using BlotzTask.Shared.BackgroundTasks;
using BlotzTask.Shared.Events;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Referrals.Controllers;

[Route("api/referral")]
public class ReferralController(
    GetMyReferralCodeQueryHandler getMyReferralCodeQueryHandler,
    IBackgroundTaskQueue backgroundTaskQueue,
    RedeemReferralCodeCommandHandler redeemReferralCodeCommandHandler) : AuthorizedControllerBase
{
    [HttpGet("my-code")]
    public async Task<ReferralCodeDto> GetMyReferralCode(CancellationToken ct)
    {
        var userId = UserId;

        return await getMyReferralCodeQueryHandler.Handle(new GetMyReferralCodeQuery { UserId = userId }, ct);
    }

    [HttpPost("redeem")]
    public async Task<RedeemReferralCodeResponse> RedeemReferralCode([FromBody] RedeemReferralCodeRequest request, CancellationToken ct)
    {
        var userId = UserId;

        var result = await redeemReferralCodeCommandHandler.Handle(new RedeemReferralCodeCommand
        {
            RefereeUserId = userId,
            Code = request.Code
        }, ct);

        backgroundTaskQueue.Enqueue(async (sp, ct) =>
        {
            var dispatcher = sp.GetRequiredService<IEventDispatcher>();
            await dispatcher.DispatchAsync(new ReferralCodeRedeemedEvent
            {
                ReferrerUserId = result.ReferrerUserId,
                RefereeUserId = userId
            }, ct);
        });

        return new RedeemReferralCodeResponse { Badge = result.Badge };
    }
}
