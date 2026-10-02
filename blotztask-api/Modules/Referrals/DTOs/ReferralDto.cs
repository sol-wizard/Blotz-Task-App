namespace BlotzTask.Modules.Referrals.DTOs;

public class ReferralCodeDto
{
    public required string Code { get; init; }
    public required int RedemptionCount { get; init; }
    public required double? TargetCount { get; init; }
    public required string? BadgeIconUrl { get; init; }
}

public class RedeemReferralCodeRequest
{
    public required string Code { get; init; }
}

