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
    EquipBadgeCommandHandler equipBadgeCommandHandler) : ControllerBase

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

    // Equipping is idempotent: a retried request re-equips the same badge into the same slot
    // instead of toggling it back off.
    [HttpPost("{id}/equip")]
    public async Task<List<EquippedBadgeDto>> EquipBadge(int id, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new EquipBadgeCommand { BadgeId = id, UserId = userId };
        return await equipBadgeCommandHandler.Handle(command, ct);
    }
}

