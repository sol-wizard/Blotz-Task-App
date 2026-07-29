using BlotzTask.Modules.Referrals.Commands;
using BlotzTask.Modules.Referrals.DTOs;

namespace BlotzTask.Modules.Referrals.Queries;

public class GetMyReferralCodeQuery
{
    public required Guid UserId { get; init; }
}

public class GetMyReferralCodeQueryHandler(EnsureReferralCodeHandler ensureReferralCode)
{
    public async Task<ReferralCodeDto> Handle(GetMyReferralCodeQuery query, CancellationToken ct = default)
    {
        var referralCode = await ensureReferralCode.HandleAsync(query.UserId, ct);

        return new ReferralCodeDto { Code = referralCode.Code! };
    }
}
