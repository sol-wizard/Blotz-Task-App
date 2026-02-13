using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public class DeleteUserCommandHandler(
    BlotzTaskDbContext db,
    IAuth0ManagementService auth0ManagementService,
    ILogger<DeleteUserCommandHandler> logger)
{
    public async Task<string> Handle(Guid UserId, CancellationToken ct = default)
    {
        if (UserId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(UserId));

        var appUser = await db.AppUsers
            .SingleOrDefaultAsync(u => u.Id == UserId, ct);

        if (appUser == null)
            throw new NotFoundException($"User with ID {UserId} not found.");

        var auth0UserId = appUser.Auth0UserId;

        try
        {
            await auth0ManagementService.DeleteUserAsync(auth0UserId, ct);
            logger.LogInformation("Deleted Auth0 user {Auth0UserId} before DB cleanup for {UserId}", auth0UserId, UserId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Failed to delete Auth0 user {Auth0UserId} for {UserId}. Aborting DB deletion.",
                auth0UserId, UserId);
            throw;
        }

        try
        {
            db.AppUsers.Remove(appUser);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Deleted user data from database for {UserId}", UserId);
            return "User deleted successfully.";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete user data for {UserId} from database", UserId);
            throw;
        }
    }
}
