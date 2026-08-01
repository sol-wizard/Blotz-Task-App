using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Badges.Domain;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Badges.Commands;

public class EquipBadgeCommand
{
    public required Guid UserId { get; init; }
    public required int BadgeId { get; init; }
}

public class UnequipBadgeCommand
{
    public required Guid UserId { get; init; }
    public required int BadgeId { get; init; }
}

public class EquippedBadgeDto
{
    public int BadgeId { get; set; }
    public int Slot { get; set; }
}

internal static class BadgeDisplaySlots
{
    public const int Count = 3;

    public static async Task<(List<UserBadge> UserBadges, UserBadge Target)> LoadAsync(
        BlotzTaskDbContext db, Guid userId, int badgeId, CancellationToken ct)
    {
        var userBadges = await db.UserBadges
            .Where(ub => ub.UserId == userId)
            .ToListAsync(ct);

        var target = userBadges.FirstOrDefault(ub => ub.BadgeId == badgeId)
            ?? throw new NotFoundException($"Badge with ID {badgeId} not found for the current user.");

        return (userBadges, target);
    }

    public static List<UserBadge> Equipped(IEnumerable<UserBadge> userBadges) =>
        userBadges
            .Where(ub => ub.DisplayOrder is not null)
            .OrderBy(ub => ub.DisplayOrder)
            .ToList();

    public static void Renumber(List<UserBadge> equipped)
    {
        for (var i = 0; i < equipped.Count; i++)
            equipped[i].DisplayOrder = i;
    }

    public static List<EquippedBadgeDto> ToDto(List<UserBadge> equipped) =>
        equipped
            .Select(ub => new EquippedBadgeDto { BadgeId = ub.BadgeId, Slot = ub.DisplayOrder!.Value })
            .ToList();

    public static async Task MarkCustomized(BlotzTaskDbContext db, ILogger logger, Guid userId, CancellationToken ct)
    {
        var preference = await db.UserPreferences.FindAsync(userId, ct);

        if (preference is null)
        {
            logger.LogWarning(
                "No user preferences row for user {UserId}; badge display customisation flag left unset", userId);
            return;
        }

        preference.HasCustomizedBadgeDisplay = true;
    }
}

public class EquipBadgeCommandHandler(BlotzTaskDbContext db, ILogger<EquipBadgeCommandHandler> logger)
{
    public async Task<List<EquippedBadgeDto>> Handle(EquipBadgeCommand command, CancellationToken ct = default)
    {
        var (userBadges, target) =
            await BadgeDisplaySlots.LoadAsync(db, command.UserId, command.BadgeId, ct);

        var equipped = BadgeDisplaySlots.Equipped(userBadges);

        if (target.DisplayOrder is not null)
        {
            logger.LogInformation(
                "Badge {BadgeId} is already on display for user {UserId}", command.BadgeId, command.UserId);
            return BadgeDisplaySlots.ToDto(equipped);
        }

        // FIFO: If the user has already equipped the maximum number of badges, unequip the oldest one.
        while (equipped.Count >= BadgeDisplaySlots.Count)
        {
            equipped[0].DisplayOrder = null;
            equipped.RemoveAt(0);
        }

        equipped.Add(target);
        BadgeDisplaySlots.Renumber(equipped);
        await BadgeDisplaySlots.MarkCustomized(db, logger, command.UserId, ct);

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "User {UserId} equipped badge {BadgeId} into slot {Slot}",
            command.UserId, command.BadgeId, target.DisplayOrder);

        return BadgeDisplaySlots.ToDto(equipped);
    }
}

public class UnequipBadgeCommandHandler(BlotzTaskDbContext db, ILogger<UnequipBadgeCommandHandler> logger)
{
    public async Task<List<EquippedBadgeDto>> Handle(UnequipBadgeCommand command, CancellationToken ct = default)
    {
        var (userBadges, target) =
            await BadgeDisplaySlots.LoadAsync(db, command.UserId, command.BadgeId, ct);

        var equipped = BadgeDisplaySlots.Equipped(userBadges);

        if (target.DisplayOrder is null)
        {
            logger.LogInformation(
                "Badge {BadgeId} is already off display for user {UserId}", command.BadgeId, command.UserId);
            return BadgeDisplaySlots.ToDto(equipped);
        }

        target.DisplayOrder = null;
        equipped.Remove(target);
        BadgeDisplaySlots.Renumber(equipped);
        await BadgeDisplaySlots.MarkCustomized(db, logger, command.UserId, ct);

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "User {UserId} unequipped badge {BadgeId}, {Count} badge(s) left on display",
            command.UserId, command.BadgeId, equipped.Count);

        return BadgeDisplaySlots.ToDto(equipped);
    }
}
