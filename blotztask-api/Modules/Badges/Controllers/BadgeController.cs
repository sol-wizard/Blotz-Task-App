using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Badges.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class BadgeController(
    GetUserBadgesQueryHandler getUserBadgesQueryHandler,
    GetBadgeByIdQueryHandler getBadgeByIdQueryHandler,
    EquipBadgeCommandHandler equipBadgeCommandHandler,
    UnequipBadgeCommandHandler unequipBadgeCommandHandler) : ControllerBase

{
    [HttpGet]
    public async Task<List<BadgeDto>> GetUserBadges(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetUserBadgesQuery { UserId = userId };
        return await getUserBadgesQueryHandler.Handle(query, ct);
    }

    [HttpGet("{id}")]
    public async Task<BadgeByIdItemDto> GetBadgeById(int id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetBadgeByIdQuery { BadgeId = id, UserId = userId };
        return await getBadgeByIdQueryHandler.Handle(query, ct);
    }

    // Equip and unequip are separate verbs rather than one toggle so that a retried or duplicated
    // request cannot flip the badge back to the opposite state.
    [HttpPost("{id}/equip")]
    public async Task<List<EquippedBadgeDto>> EquipBadge(int id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new EquipBadgeCommand { BadgeId = id, UserId = userId };
        return await equipBadgeCommandHandler.Handle(command, ct);
    }

    [HttpDelete("{id}/equip")]
    public async Task<List<EquippedBadgeDto>> UnequipBadge(int id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new UnequipBadgeCommand { BadgeId = id, UserId = userId };
        return await unequipBadgeCommandHandler.Handle(command, ct);
    }
}

