using BlotzTask.Modules.Pomodoro.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Pomodoro.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PomodoroController(
    UpdatePomodoroSettingCommandHandler updatePomodoroSettingCommandHandler,
    ILogger<PomodoroController> logger) : Controller
{
    [HttpPut]
    public async Task<bool> UpdatePomodoroSetting(
        [FromBody] UpdatePomodoroSettingDto updatePomodoroSettingDto,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        
        logger.LogInformation("Updating Pomodoro Setting for user {UserId}", userId);
        
        var command = new UpdatePomodoroSettingCommand
        {
            UserId = userId,
            PomodoroSetting = updatePomodoroSettingDto
        };
        
        return await updatePomodoroSettingCommandHandler.Handle(command, ct);
    }
}