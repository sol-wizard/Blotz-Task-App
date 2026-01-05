using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Users.Queries;

public class GetUserPreferencesQuery
{
    public Guid UserId { get; set; }
}

public class GetUserPreferencesQueryHandler(BlotzTaskDbContext db, ILogger<GetUserPreferencesQueryHandler> logger)
{
    public async Task<GetUserPreferencesDTO> Handle(GetUserPreferencesQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching user preferences for user {UserId}", query.UserId);

        var preference = await db.UserPreferences.FindAsync(query.UserId, ct);

        if (preference == null)
        {
            logger.LogError("User preferences not found for user {UserId}", query.UserId);
            throw new NotFoundException($"User preferences for user ID {query.UserId} not found.");
        }

        logger.LogInformation("Retrieved user preferences for user {UserId}", query.UserId);

        return new GetUserPreferencesDTO
        {
            AutoRollover = preference.AutoRollover,
            UpcomingNotification = preference.UpcomingNotification,
            OverdueNotification = preference.OverdueNotification,
            DailyPlanningNotification = preference.DailyPlanningNotification,
            EveningWrapUpNotification = preference.EveningWrapUpNotification,
            PreferredLanguage = preference.PreferredLanguage
        };
    }

}

public class GetUserPreferencesDTO
{
    public bool AutoRollover { get; set; }
    public bool UpcomingNotification { get; set; }
    public bool OverdueNotification { get; set; }
    public bool DailyPlanningNotification { get; set; }
    public bool EveningWrapUpNotification { get; set; }
    public Language PreferredLanguage { get; set; }
}
