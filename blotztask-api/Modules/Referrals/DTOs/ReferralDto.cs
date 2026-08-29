namespace BlotzTask.Modules.Referrals.DTOs;

public class ReferralCodeDto
{
    public required string Code { get; init; }
}

public class RedeemReferralCodeRequest
{
    public required string Code { get; init; }
}
