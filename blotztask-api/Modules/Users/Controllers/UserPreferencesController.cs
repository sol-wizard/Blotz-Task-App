using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.Queries;
using Microsoft.AspNetCore.Authorization;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/user-preferences")]
[Authorize]
public class UserPreferencesController(
    UpdateUserPreferenceCommandHandler updateUserPreferenceCommandHandler,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler
) : AuthorizedControllerBase
{
    [HttpPut]
    public async Task<string> UpdateUserPreferences(
        [FromBody] UpdateUserPreferenceDto updateUserPreferenceDto,
        CancellationToken ct)
    {
        var userId = UserId;

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
        var userId = UserId;

        var query = new GetUserPreferencesQuery
        {
            UserId = userId,
        };
        return await getUserPreferencesQueryHandler.Handle(query, ct);

    }
}
