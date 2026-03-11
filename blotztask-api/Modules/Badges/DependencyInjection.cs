using BlotzTask.Modules.Badges.Commands;

namespace BlotzTask.Modules.Badges;

public static class DependencyInjection
{
    public static IServiceCollection AddBadgeModule(this IServiceCollection services)
    {
        services.AddScoped<CheckAndAwardBadgesCommandHandler>();

        return services;
    }
}
