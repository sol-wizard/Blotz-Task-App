using System.Security.Claims;
using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.DTOs;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController(IUserService userService, AddUserCommandHandler addUserCommandHandler, ILogger<UserController> logger) : ControllerBase
{
    [HttpGet("current-user-info")]
    [Obsolete("This controller is not in use on mobile app and will be removed/refactor later.")]
    public async Task<IActionResult> GetCurrentUserInfo()
    {
        // Use UserInfoService to get User info.
        try{
            // Extract user ID from claims
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated or missing required claims" });
            }

            var userInfo = await userService.GetCurrentUserInfoAsync(userId);
            var message = userInfo.Message;
            // return result
            return Ok(new ResponseWrapper<UserInfoDto>(userInfo, message, true));
        }catch(Exception){
            throw;
        }
        
    }
    
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        var result = await userService.RegisterUserAsync(request);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok(new { message = "User registered successfully." });
    }
    
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
