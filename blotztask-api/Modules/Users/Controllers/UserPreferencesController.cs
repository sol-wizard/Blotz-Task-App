using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/user-preferences")]
[Authorize]
public class UserPreferencesController(
    UpdateUserPreferenceCommandHandler updateUserPreferenceCommandHandler,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler
) : ControllerBase
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
            UserPreferences = updateUserPreferenceDto
        };

        return await updateUserPreferenceCommandHandler.Handle(command, ct);
    }

    [HttpGet]
    public async Task<GetUserPreferencesDTO> GetUserPreferences(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

        var query = new GetUserPreferencesQuery
        {
            UserId = userId,
        };
        return await getUserPreferencesQueryHandler.Handle(query, ct);

    }
}
