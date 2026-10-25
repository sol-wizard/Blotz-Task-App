using BlotzTask.Modules.Users.Commands;
using Microsoft.AspNetCore.Authorization;
using BlotzTask.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users.Controllers;

[Authorize]
[ApiController]
[Route("api/user-push-tokens")]
public class UserPushTokenController(UpsertPushTokenCommandHandler upsertPushTokenCommandHandler) : AuthorizedControllerBase
{
    [HttpPost]
    public async Task<IActionResult> UpsertPushToken([FromBody] UpsertPushTokenRequest request, CancellationToken ct)
    {
        var userId = UserId;

        var command = new UpsertPushTokenCommand
        {
            UserId = userId,
            Token = request.Token,
            DeviceId = request.DeviceId
        };

        await upsertPushTokenCommandHandler.Handle(command, ct);
        return NoContent();
    }
}
