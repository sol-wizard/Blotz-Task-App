using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Referrals.Domain;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Referrals.Commands;

public class RedeemReferralCodeCommand
{
    public required Guid RefereeUserId { get; init; }
    public required string Code { get; init; }
}

public class RedeemReferralCodeCommandHandler(
    BlotzTaskDbContext db,
    ILogger<RedeemReferralCodeCommandHandler> logger)
{
    public async Task Handle(RedeemReferralCodeCommand command, CancellationToken ct = default)
    {
        var code = command.Code.Trim().ToUpperInvariant();

        var referee = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == command.RefereeUserId, ct)
            ?? throw new NotFoundException("User not found.");

        if (referee.IsOnboarded)
            throw new ForbiddenException("Invite codes can only be redeemed during onboarding.");

        var referralCode = await db.ReferralCodes.FirstOrDefaultAsync(r => r.Code == code, ct)
            ?? throw new NotFoundException("Referral code not found.");

        if (referralCode.OwnerUserId == command.RefereeUserId)
            throw new ArgumentException("You cannot redeem your own referral code.");

        var alreadyRedeemed = await db.Referrals.AnyAsync(r => r.RefereeUserId == command.RefereeUserId, ct);
        if (alreadyRedeemed)
            throw new InvalidOperationException("You have already redeemed a referral code.");

        db.Referrals.Add(new Referral
        {
            ReferrerUserId = referralCode.OwnerUserId,
            RefereeUserId = command.RefereeUserId,
            CodeUsed = code,
            RedeemedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {RefereeUserId} redeemed referral code from {ReferrerUserId}",
            command.RefereeUserId, referralCode.OwnerUserId);
    }
}
