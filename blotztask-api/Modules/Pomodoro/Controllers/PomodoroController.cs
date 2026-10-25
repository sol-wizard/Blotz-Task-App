using BlotzTask.Modules.Pomodoro.Commands;
using BlotzTask.Modules.Pomodoro.Queries;
using Microsoft.AspNetCore.Authorization;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Pomodoro.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PomodoroController(
    GetPomodoroSettingQueryHandler getPomodoroSettingQueryHandler,
    UpdatePomodoroSettingCommandHandler updatePomodoroSettingCommandHandler,
    ILogger<PomodoroController> logger) : AuthorizedControllerBase
{
    [HttpGet]
    public async Task<GetPomodoroSettingDto> GetPomodoroSetting(CancellationToken ct)
    {
        var userId = UserId;

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
        var userId = UserId;
        
        logger.LogInformation("Updating Pomodoro Setting for user {UserId}", userId);
        
        var command = new UpdatePomodoroSettingCommand
        {
            UserId = userId,
            PomodoroSetting = updatePomodoroSettingDto
        };
        
        return await updatePomodoroSettingCommandHandler.Handle(command, ct);
    }
}