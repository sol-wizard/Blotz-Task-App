using BlotzTask.Modules.Users.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users.Controllers;

[Authorize]
[ApiController]
[Route("api/user-push-tokens")]
public class UserPushTokenController(UpsertPushTokenCommandHandler upsertPushTokenCommandHandler) : ControllerBase
{
    public record UpsertPushTokenRequest(string Token, string DeviceId);

    [HttpPost]
    public async Task<IActionResult> UpsertPushToken([FromBody] UpsertPushTokenRequest request, CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");

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
