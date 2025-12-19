using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Users.Commands;

public class UpdateUserPreferenceCommand
{
    public Guid UserId { get; set; }
    [Required]
    public required UpdateUserPreferenceDto UserPreferences { get; set; }
}

public class UpdateUserPreferenceCommandHandler(
    BlotzTaskDbContext db,
    ILogger<UpdateUserPreferenceCommandHandler> logger)
{
    public async Task<string> Handle(UpdateUserPreferenceCommand command, CancellationToken ct = default)
    {
        logger.LogInformation("Updating User Preferences for user {UserId}", command.UserId);

        var preference = await db.UserPreferences.FindAsync(command.UserId, ct);

        if (preference == null)
            throw new NotFoundException($"User preferences for user ID {command.UserId} not found.");

        preference.AutoRollover = command.UserPreferences.AutoRollover;
        preference.UpcomingNotification = command.UserPreferences.UpcomingNotification;
        preference.OverdueNotification = command.UserPreferences.OverdueNotification;
        preference.DailyPlanningNotification = command.UserPreferences.DailyPlanningNotification;
        preference.EveningWrapUpNotification = command.UserPreferences.EveningWrapUpNotification;

        db.UserPreferences.Update(preference);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Updated User Preferences for user {UserId} successfully.", command.UserId);

        return "User preference updated successfully.";
    }
}

public class UpdateUserPreferenceDto
{
    public bool AutoRollover { get; set; }
    public bool UpcomingNotification { get; set; }
    public bool OverdueNotification { get; set; }
    public bool DailyPlanningNotification { get; set; }
    public bool EveningWrapUpNotification { get; set; }
}
