using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Services;

namespace BlotzTask.Modules.Badges;

public static class DependencyInjection
{
    public static IServiceCollection AddBadgeModule(this IServiceCollection services)
    {
        services.AddScoped<FindMatchingBadgesHandler>();
        services.AddScoped<AwardNewBadgesToUserHandler>();

        services.AddHttpClient("Expo", client =>
        {
            client.BaseAddress = new Uri("https://exp.host/--/api/v2/");
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });
        services.AddScoped<IBadgeNotificationService, BadgeNotificationService>();

        return services;
    }
}
