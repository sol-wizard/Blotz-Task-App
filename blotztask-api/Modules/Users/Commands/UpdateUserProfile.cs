using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Users.Commands;

public class UpdateUserProfileCommand
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
}

public class UpdateUserProfileCommandHandler(
    BlotzTaskDbContext db,
    ILogger<UpdateUserProfileCommandHandler> logger,
    IAuth0ManagementService auth0ManagementService)
{
    public async Task<string> Handle(UpdateUserProfileCommand profileCommand, CancellationToken ct = default)
    {
        logger.LogInformation("Updating User Profile for user {UserId}", profileCommand.Id);

        var user = await db.AppUsers.FindAsync(profileCommand.Id, ct);

        if (user == null) throw new NotFoundException($"User with ID {profileCommand.Id} not found.");

        var auth0UserId = user.Auth0UserId;

        await auth0ManagementService.UpdateUserProfileAsync(
            auth0UserId,
            profileCommand.DisplayName
        );

        logger.LogInformation("Updated User Profile for user {UserId} successfully in auth0.", profileCommand.Id);

        var auth0User = await auth0ManagementService.GetUserAsync(auth0UserId, ct);
        logger.LogInformation("Found User Profile for user {UserId} in auth0.", profileCommand.Id);

        user.DisplayName = auth0User.FullName;
        user.UpdatedAt = DateTime.UtcNow;

        db.AppUsers.Update(user);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Updated User Profile for user {UserId} successfully in database.", user.Id);

        return "User profile updated successfully.";
    }
}

public class UpdateUserProfileDto
{
    public required string DisplayName { get; set; }
}