using BlotzTask.Modules.Users.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/user-preferences")]
[Authorize]
public class UserPreferencesController(
    UpdateUserPreferenceCommandHandler updateUserPreferenceCommandHandler) : ControllerBase
{
    [HttpPut]
    public async Task<string> UpdateUserPreferences(
        [FromBody] UpdateUserPreferenceDto updateUserPreferenceDto,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var command = new UpdateUserPreferenceCommand
        {
            UserId = userId,
            Preferences = updateUserPreferenceDto
        };

        return await updateUserPreferenceCommandHandler.Handle(command, ct);
    }
}

