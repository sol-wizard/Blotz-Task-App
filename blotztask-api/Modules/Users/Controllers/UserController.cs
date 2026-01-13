using System.Text.Json;
using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.Users;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController(
    SyncUserCommandHandler syncUserCommandHandler,
    GetUserProfileQueryHandler getUserProfileQueryHandler,
    UpdateUserProfileCommandHandler updateUserProfileCommandHandler,
    ILogger<UserController> logger,
    IConfiguration configuration) : ControllerBase
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

    [HttpGet]
    public async Task<UserProfileDTO> GetUserProfile(CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new InvalidOperationException("UserProfile not found");

        var query = new GetUserProfileQuery
        {
            UserId = userId
        };

        return await getUserProfileQueryHandler.Handle(query, ct);
        ;
    }

    [HttpPut]
    public async Task<string> UpdateUserProfile([FromBody] UpdateUserProfileDto updateUserProfileDto,
        CancellationToken ct)
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        var command = new UpdateUserProfileCommand
        {
            Id = userId,
            DisplayName = updateUserProfileDto.DisplayName,
            PictureUrl = updateUserProfileDto.PictureUrl,
            IsOnboarded = updateUserProfileDto.IsOnboarded
        };
        return await updateUserProfileCommandHandler.Handle(command, ct);
    }
}