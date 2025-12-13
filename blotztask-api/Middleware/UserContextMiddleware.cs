using System.Diagnostics;
using System.Security.Claims;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Middleware;

public class UserContextMiddleware
{
    private readonly ILogger<UserContextMiddleware> _logger;
    private readonly RequestDelegate _next;

    public UserContextMiddleware(RequestDelegate next, ILogger<UserContextMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, BlotzTaskDbContext dbContext)
    {
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("UserContextMiddleware starting for {Path}", context.Request.Path);

        if (context.User.Identity?.IsAuthenticated == true)
        {
            var auth0UserId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(auth0UserId))
            {
                _logger.LogError("Authenticated user but no {Claim}", ClaimTypes.NameIdentifier);
                throw new UnauthorizedAccessException("Could not resolve Auth0 user id.");
            }

            var beforeDbMs = sw.ElapsedMilliseconds;
            _logger.LogInformation(
                "UserContextMiddleware: querying AppUsers for Auth0 user {Auth0UserId}. Elapsed so far: {Elapsed} ms",
                auth0UserId, beforeDbMs);


            var appUser = await dbContext.AppUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId);

            var afterDbMs = sw.ElapsedMilliseconds;
            _logger.LogInformation(
                "UserContextMiddleware: finished querying AppUsers. DB query took ~{DbDuration} ms (from {BeforeDb} ms to {AfterDb} ms total).",
                afterDbMs - beforeDbMs, beforeDbMs, afterDbMs);

            if (appUser == null)
            {
                _logger.LogWarning("Auth0 user {Auth0UserId} not found in AppUsers", auth0UserId);
                throw new UnauthorizedAccessException("User is not registered in this app.");
            }

            context.Items["UserId"] = appUser.Id;

            _logger.LogInformation(
                "UserContextMiddleware: resolved AppUser {AppUserId} for {Auth0UserId}. Elapsed: {Elapsed} ms",
                appUser.Id, auth0UserId, sw.ElapsedMilliseconds);
        }

        await _next(context);

        sw.Stop();
        _logger.LogInformation(
            "UserContextMiddleware finished for {Path} in {Elapsed} ms",
            context.Request.Path, sw.ElapsedMilliseconds);
    }
}