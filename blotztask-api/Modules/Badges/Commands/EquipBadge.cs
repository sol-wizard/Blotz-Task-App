using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class EquipBadgeCommand
{
    public required Guid UserId { get; init; }
    public required int BadgeId { get; init; }
}

public class EquipBadgeCommandHandler(BlotzTaskDbContext db, ILogger<EquipBadgeCommandHandler> logger)
{
    private const int SlotCount = 3;

    public async Task Handle(EquipBadgeCommand command, CancellationToken ct = default)
    {
        var userBadges = await db.UserBadges
            .Where(ub => ub.UserId == command.UserId)
            .ToListAsync(ct);

        var target = userBadges.FirstOrDefault(ub => ub.BadgeId == command.BadgeId)
            ?? throw new NotFoundException($"Badge with ID {command.BadgeId} not found for the current user.");

        var equipped = userBadges
            .Where(ub => ub.DisplayOrder is not null)
            .OrderBy(ub => ub.DisplayOrder)
            .ToList();

        if (target.DisplayOrder is not null)
        {
            logger.LogInformation(
                "Badge {BadgeId} is already on display for user {UserId}", command.BadgeId, command.UserId);
            return;
        }

        // FIFO: the display holds at most three badges, so a new one pushes the oldest out.
        while (equipped.Count >= SlotCount)
        {
            equipped[0].DisplayOrder = null;
            equipped.RemoveAt(0);
        }

        equipped.Add(target);

        for (var i = 0; i < equipped.Count; i++)
            equipped[i].DisplayOrder = i;

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "User {UserId} equipped badge {BadgeId} into slot {Slot}",
            command.UserId, command.BadgeId, target.DisplayOrder);
    }
}
