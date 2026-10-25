using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Shared.Controllers;

[ApiController]
[Authorize]
public abstract class AuthorizedControllerBase : ControllerBase
{
    // Set by UserContextMiddleware for authenticated requests
    protected Guid UserId =>
        HttpContext.Items.TryGetValue("UserId", out var userIdObj) && userIdObj is Guid userId
            ? userId
            : throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
}
