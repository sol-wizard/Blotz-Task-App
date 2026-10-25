using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Queries;
using Microsoft.AspNetCore.Authorization;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Badges.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class BadgeController(
    GetUserBadgesQueryHandler getUserBadgesQueryHandler,
    GetBadgeByIdQueryHandler getBadgeByIdQueryHandler,
    EquipBadgeCommandHandler equipBadgeCommandHandler) : AuthorizedControllerBase

{
    [HttpGet]
    public async Task<List<BadgeDto>> GetUserBadges(CancellationToken ct)
    {
        var userId = UserId;

        var query = new GetUserBadgesQuery { UserId = userId };
        return await getUserBadgesQueryHandler.Handle(query, ct);
    }

    [HttpGet("{id}")]
    public async Task<BadgeByIdItemDto> GetBadgeById(int id, CancellationToken ct)
    {
        var userId = UserId;

        var query = new GetBadgeByIdQuery { BadgeId = id, UserId = userId };
        return await getBadgeByIdQueryHandler.Handle(query, ct);
    }

    [HttpPost("{id}/equip")]
    public async Task<IActionResult> EquipBadge(int id, CancellationToken ct)
    {
        var userId = UserId;

        var command = new EquipBadgeCommand { BadgeId = id, UserId = userId };
        await equipBadgeCommandHandler.Handle(command, ct);

        return NoContent();
    }
}

