using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Referrals.Domain;
using BlotzTask.Modules.Referrals.Services;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Referrals.Commands;

public class EnsureReferralCodeHandler(
    BlotzTaskDbContext db,
    ReferralCodeGenerator generator,
    ILogger<EnsureReferralCodeHandler> logger)
{
    public async Task HandleAsync(Guid userId, CancellationToken ct = default)
    {
        var referralCode = await db.ReferralCodes.FirstOrDefaultAsync(r => r.OwnerUserId == userId, ct);

        if (referralCode is not null && referralCode.Code is not null) return;

        if (referralCode is null)
        {
            referralCode = new ReferralCode
            {
                OwnerUserId = userId,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.ReferralCodes.Add(referralCode);
            await db.SaveChangesAsync(ct);
        }

        referralCode.Code = generator.Encode(referralCode.Id);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Generated referral code for user {UserId}", userId);
    }
}
