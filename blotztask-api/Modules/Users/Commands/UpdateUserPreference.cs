using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public class UpdateUserPreferenceCommand
{
    public Guid UserId { get; set; }
    [Required]
    public required UpdateUserPreferenceDto UserPreferences { get; set; }
}

public class UpdateUserPreferenceCommandHandler(
    BlotzTaskDbContext db,
    TimeProvider clock,
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
        preference.PreferredLanguage = command.UserPreferences.PreferredLanguage;
        // Older clients omit these fields; leaving them untouched keeps their PUT from switching them off.
        var memoryTurnedOn = command.UserPreferences.AiMemoryEnabled == true && !preference.AiMemoryEnabled;
        if (command.UserPreferences.AiMemoryEnabled is { } aiMemoryEnabled)
            preference.AiMemoryEnabled = aiMemoryEnabled;
        if (command.UserPreferences.ReviewNotification is { } reviewNotification)
            preference.ReviewNotification = reviewNotification;

        db.UserPreferences.Update(preference);
        await using var transaction = memoryTurnedOn ? await db.Database.BeginTransactionAsync(ct) : null;
        await db.SaveChangesAsync(ct);
        if (memoryTurnedOn)
        {
            // The digest reads the switch only when it runs, minutes after a message. Moving the cursor and
            // closing open topics with an empty summary keeps what was said while memory was off from being
            // learned or summarised once it is back on.
            var now = clock.GetUtcNow();
            await db.AiCoachConversations.Where(c => c.UserId == command.UserId && c.MemoryProcessedAt < now)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.MemoryProcessedAt, now), ct);
            await db.AiCoachConversations.Where(c => c.UserId == command.UserId && c.ClosingSummary == null)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.ClosingSummary, ""), ct);
            await transaction!.CommitAsync(ct);
        }

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
    public Language PreferredLanguage { get; set; }
    public bool? AiMemoryEnabled { get; set; }
    public bool? ReviewNotification { get; set; }
}
