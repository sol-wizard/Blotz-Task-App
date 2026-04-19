using BlotzTask.Modules.Pomodoro.Commands;
using BlotzTask.Modules.Pomodoro.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Pomodoro.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PomodoroController(
    GetPomodoroSettingQueryHandler getPomodoroSettingQueryHandler,
    UpdatePomodoroSettingCommandHandler updatePomodoroSettingCommandHandler,
    ILogger<PomodoroController> logger) : Controller
{
    [HttpGet]
    public async Task<GetPomodoroSettingDto> GetPomodoroSetting(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        logger.LogInformation("Fetching Pomodoro Setting for user {UserId}", userId);

        var query = new GetPomodoroSettingQuery
        {
            UserId = userId
        };

        return await getPomodoroSettingQueryHandler.Handle(query, ct);
    }

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