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
    public async Task<ReferralCode> HandleAsync(Guid userId, CancellationToken ct = default)
    {
        var referralCode = await db.ReferralCodes.FirstOrDefaultAsync(r => r.OwnerUserId == userId, ct);

        if (referralCode is not null && referralCode.Code is not null) return referralCode;

        if (referralCode is null)
        {
            referralCode = new ReferralCode
            {
                OwnerUserId = userId,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.ReferralCodes.Add(referralCode);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Another concurrent request already created the row for this user
                // (unique index on OwnerUserId) — fall back to reading it instead of failing.
                db.Entry(referralCode).State = EntityState.Detached;
                referralCode = await db.ReferralCodes.FirstAsync(r => r.OwnerUserId == userId, ct);
            }
        }

        referralCode.Code = generator.Encode(referralCode.Id);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Generated referral code for user {UserId}", userId);

        return referralCode;
    }
}
