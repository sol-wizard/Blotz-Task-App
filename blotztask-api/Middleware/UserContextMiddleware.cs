using System.Diagnostics;
using System.Security.Claims;
using BlotzTask.Infrastructure.Data;
using Microsoft.Extensions.Caching.Memory;
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

    public async Task InvokeAsync(HttpContext context, BlotzTaskDbContext dbContext, IMemoryCache cache)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var auth0UserId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(auth0UserId))
            {
                _logger.LogError("Authenticated user but no {Claim}", ClaimTypes.NameIdentifier);
                throw new UnauthorizedAccessException("Could not resolve Auth0 user id.");
            }

            // Cache Auth0 -> AppUser mapping to avoid a DB lookup on every authenticated request.
            // This is safe because AppUserId is stable for an Auth0UserId.
            var cacheKey = $"userctx:auth0:{auth0UserId}";
            if (cache.TryGetValue<Guid>(cacheKey, out var cachedUserId))
            {
                context.Items["UserId"] = cachedUserId;
                await _next(context);
                return;
            }

            var sw = Stopwatch.StartNew();
            var appUser = await dbContext.AppUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Auth0UserId == auth0UserId, context.RequestAborted);

            if (appUser == null)
            {
                _logger.LogWarning("Auth0 user {Auth0UserId} not found in AppUsers", auth0UserId);
                throw new UnauthorizedAccessException("User is not registered in this app.");
            }

            context.Items["UserId"] = appUser.Id;

            cache.Set(
                cacheKey,
                appUser.Id,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15),
                    SlidingExpiration = TimeSpan.FromMinutes(5)
                });

            // Keep this at Debug so prod telemetry isn't flooded.
            if (_logger.IsEnabled(LogLevel.Debug))
            {
                _logger.LogDebug(
                    "UserContextMiddleware resolved AppUser {AppUserId} for {Auth0UserId} in {ElapsedMs} ms",
                    appUser.Id, auth0UserId, sw.ElapsedMilliseconds);
            }
        }

        await _next(context);
    }
}