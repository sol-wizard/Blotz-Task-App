using BlotzTask.Modules.Badges.Queries;

namespace BlotzTask.Modules.Referrals.DTOs;

public class ReferralCodeDto
{
    public required string Code { get; init; }
    public required int RedemptionCount { get; init; }
    public required double? TargetCount { get; init; }
    public required string? BadgeIconUrl { get; init; }
    public required bool HasEarnedBadge { get; init; }
}

public class RedeemReferralCodeRequest
{
    public required string Code { get; init; }
}

public class RedeemReferralCodeResponse
{
    // Null when no badge matched (e.g. its row isn't inserted yet) or awarding it failed.
    public required BadgeByIdItemDto? Badge { get; init; }
}

