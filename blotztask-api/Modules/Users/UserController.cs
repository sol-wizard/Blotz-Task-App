using System.Security.Claims;
using BlotzTask.Modules.Users.DTOs;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/[controller]")]
[Authorize] // make sure only authenticate user can use this method
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("current-user-info")]
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

            var userInfo = await _userService.GetCurrentUserInfoAsync(userId);
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
        
        var result = await _userService.RegisterUserAsync(request);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok(new { message = "User registered successfully." });
    }
}
