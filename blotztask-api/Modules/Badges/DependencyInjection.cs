using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Queries;
using BlotzTask.Modules.Badges.Services;

namespace BlotzTask.Modules.Badges;

public static class DependencyInjection
{
    public static IServiceCollection AddBadgeModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<FindMatchingBadgesHandler>();
        services.AddScoped<AwardNewBadgesToUserHandler>();
        services.AddScoped<GetUserBadgesQueryHandler>();
        services.AddScoped<BadgeAwardService>();
        services.AddScoped<GetBadgeByIdQueryHandler>();

        services.AddHttpClient("Expo", client =>
        {
            client.BaseAddress = new Uri(configuration["Expo:BaseUrl"]!);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });
        services.AddScoped<IBadgeNotificationService, BadgeNotificationService>();
        services.AddScoped<NotifyBadgesToUser>();

        return services;
    }
}
