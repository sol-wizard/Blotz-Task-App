using System.Security.Claims;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Middleware;

public class UserContextMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<UserContextMiddleware> _logger;

    public UserContextMiddleware(RequestDelegate next, ILogger<UserContextMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, BlotzTaskDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var auth0UserId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(auth0UserId))
            {
                _logger.LogError("Authenticated user but no {Claim}", ClaimTypes.NameIdentifier);
                throw new UnauthorizedAccessException("Could not resolve Auth0 user id.");
            }

            var appUser = await dbContext.AppUsers
                .FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);

            if (appUser == null)
            {
                _logger.LogWarning("Auth0 user {Auth0UserId} not found in AppUsers", auth0UserId);
                throw new UnauthorizedAccessException("User is not registered in this app.");
            }

            context.Items["UserId"] = appUser.Id;
        }

        await _next(context);
    }
}