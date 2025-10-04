using BlotzTask.Modules.DailyReminderGenerator.Dtos;
using BlotzTask.Modules.DailyReminderGenerator.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.DailyReminderGenerator.Controllers;

[ApiController]
[Route("/api/[controller]")]
[Authorize]
public class AiReminderController : ControllerBase
{
    private readonly AiReminderService _aiReminderService;

    public AiReminderController(AiReminderService aiReminderService)
    {
        _aiReminderService = aiReminderService;
    }

    [HttpGet("today")]
    [ProducesResponseType(typeof(ReminderResult), 200)]
    [ProducesResponseType(204)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> GetTodayReminder(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            return Unauthorized();

        var reminder = await _aiReminderService.GenerateReminderForTodayAsync(userId, ct);

        if (reminder is null) return NoContent();

        return Ok(reminder);
    }
}