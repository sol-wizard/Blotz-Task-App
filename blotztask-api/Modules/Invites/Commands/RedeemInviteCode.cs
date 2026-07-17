using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Invites.Domain;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Invites.Commands;

public class RedeemInviteCodeCommand
{
    public required Guid RedeemerId { get; init; }
    public required string Code { get; init; }
}

public class RedeemInviteCodeCommandHandler(
    BlotzTaskDbContext db,
    ILogger<RedeemInviteCodeCommandHandler> logger)
{
    public async Task Handle(RedeemInviteCodeCommand command, CancellationToken ct = default)
    {
        var code = command.Code.Trim().ToUpperInvariant();

        var inviter = await db.AppUsers.FirstOrDefaultAsync(u => u.InviteCode == code, ct)
            ?? throw new NotFoundException("Invite code not found.");

        if (inviter.Id == command.RedeemerId)
            throw new ArgumentException("You cannot redeem your own invite code.");

        var alreadyRedeemed = await db.InviteRedemptions
            .AnyAsync(r => r.RedeemerId == command.RedeemerId, ct);

        if (alreadyRedeemed)
            throw new InvalidOperationException("You have already redeemed an invite code.");

        db.InviteRedemptions.Add(new InviteRedemption
        {
            InviterId = inviter.Id,
            RedeemerId = command.RedeemerId,
            RedeemedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {RedeemerId} redeemed invite code from {InviterId}",
            command.RedeemerId, inviter.Id);
    }
}
