using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.DTOs;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Referrals.Queries;

public class GetMyReferralCodeQuery
{
    public required Guid UserId { get; init; }
}

public class GetMyReferralCodeQueryHandler(BlotzTaskDbContext db, EnsureReferralCodeHandler ensureReferralCode)
{
    public async Task<ReferralCodeDto> Handle(GetMyReferralCodeQuery query, CancellationToken ct = default)
    {
        await ensureReferralCode.HandleAsync(query.UserId, ct);

        var referralCode = await db.ReferralCodes
            .FirstAsync(r => r.OwnerUserId == query.UserId, ct);

        return new ReferralCodeDto { Code = referralCode.Code! };
    }
}
