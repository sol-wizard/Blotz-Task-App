using BlotzTask.Infrastructure.Data;
using BlotzTask.Middleware;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Modules.Users.Commands;

public class DeleteUserCommand
{
    public Guid UserId { get; set; }
}

public class DeleteUserCommandHandler(
    BlotzTaskDbContext db,
    IAuth0ManagementService auth0ManagementService,
    IMemoryCache cache,
    ILogger<DeleteUserCommandHandler> logger)
{
    public async Task<string> Handle(DeleteUserCommand command, CancellationToken ct = default)
    {
        if (command.UserId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(command.UserId));

        var appUser = await db.AppUsers
            .SingleOrDefaultAsync(u => u.Id == command.UserId, ct);

        if (appUser == null)
            throw new NotFoundException($"User with ID {command.UserId} not found.");

        var auth0UserId = appUser.Auth0UserId;

        await auth0ManagementService.DeleteUserAsync(auth0UserId, ct);
        logger.LogInformation("Deleted Auth0 user {Auth0UserId} before DB cleanup for {UserId}", auth0UserId, command.UserId);

        await db.Referrals
            .Where(r=>r.ReferrerUserId == command.UserId|| r.RefereeUserId == command.UserId)
            .ExecuteDeleteAsync(ct);
            
        db.AppUsers.Remove(appUser);
        await db.SaveChangesAsync(ct);

        cache.Remove(UserContextMiddleware.CacheKey(auth0UserId));

        logger.LogInformation("Deleted user data from database for {UserId}", command.UserId);
        return "User deleted successfully.";
    }
}
