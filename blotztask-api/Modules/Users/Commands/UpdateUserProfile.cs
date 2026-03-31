using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Users.Commands;

public class UpdateUserProfileCommand
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? PictureUrl { get; set; }
    public bool? IsOnboarded { get; set; }
}

public class UpdateUserProfileCommandHandler(
    BlotzTaskDbContext db,
    ILogger<UpdateUserProfileCommandHandler> logger)
{
    public async Task<string> Handle(UpdateUserProfileCommand profileCommand, CancellationToken ct = default)
    {
        logger.LogInformation("Updating User Profile for user {UserId}", profileCommand.Id);

        var user = await db.AppUsers.FindAsync(profileCommand.Id, ct);

        if (user == null) throw new NotFoundException($"User with ID {profileCommand.Id} not found.");

        var hasChange = false;

        if (!string.IsNullOrWhiteSpace(profileCommand.DisplayName))
        {
            user.DisplayName = profileCommand.DisplayName;
            hasChange = true;
        }

        if (!string.IsNullOrWhiteSpace(profileCommand.PictureUrl))
        {
            user.PictureUrl = profileCommand.PictureUrl;
            hasChange = true;
        }

        if (profileCommand.IsOnboarded.HasValue)
        {
            user.IsOnboarded = profileCommand.IsOnboarded.Value;
            hasChange = true;
        }

        if (hasChange)
        {
            user.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Updated User Profile for user {UserId} successfully in database.", user.Id);
        }

        return "User profile updated successfully.";
    }
}

public class UpdateUserProfileDto
{
    public string? DisplayName { get; set; }
    public string? PictureUrl { get; set; }
    public bool? IsOnboarded { get; set; }
}