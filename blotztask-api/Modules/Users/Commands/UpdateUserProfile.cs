using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Services;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Users.Commands;

public class UpdateUserProfileCommand
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? DisplayName { get; set; }
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

        user.DisplayName = profileCommand.DisplayName;
        var auth0UserId = user.Auth0UserId;

        db.AppUsers.Update(user);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("User Profile for user {UserId} updated successfully in database.", profileCommand.Id);

        await auth0ManagementService.UpdateUserProfileAsync(
            auth0UserId,
            profileCommand.DisplayName
        );

        logger.LogInformation("User Profile for user {UserId} updated successfully in auth0.", profileCommand.Id);

        return "User profile updated successfully.";
    }
}

public class UpdateUserDto
{
    public string? DisplayName { get; set; }
}