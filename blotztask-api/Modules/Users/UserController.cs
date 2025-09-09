using System.Text.Json;
using BlotzTask.Modules.Users.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController(SyncUserCommandHandler syncUserCommandHandler, ILogger<UserController> logger, IConfiguration configuration) : ControllerBase
{
    [HttpPost("user-sync")]
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> UserSync(
        [FromBody] JsonElement user,
        [FromHeader(Name = "x-api-key")] string? apiKey,
        CancellationToken ct)
    {
        var expected = configuration["ApiKeys:UserSync"];
        
        if (string.IsNullOrWhiteSpace(expected) || apiKey != expected)
        {
            logger.LogWarning("Unauthorized webhook call");
            return Unauthorized();
        }
        
        var result = await syncUserCommandHandler.Handle(new SyncUserCommand(user), ct);
        return Ok(result);
    }
}
