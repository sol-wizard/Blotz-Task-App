using BlotzTask.Modules.Users.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController(AddUserCommandHandler addUserCommandHandler, ILogger<UserController> logger) : ControllerBase
{
    [HttpPost("user-sync")]
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> UserSync(
        [FromBody] AddUserCommand command,
        [FromHeader(Name = "x-api-key")] string? apiKey,
        CancellationToken ct)
    {
        var expected = "DEV-ONLY-KEY-CHANGE-ME";
        
        if (string.IsNullOrWhiteSpace(expected) || apiKey != expected)
        {
            logger.LogWarning("Unauthorized webhook call");
            return Unauthorized();
        }
        
        var result = await addUserCommandHandler.Handle(command, ct);
        return Ok(new { ok = true, message = result });
    }
}
