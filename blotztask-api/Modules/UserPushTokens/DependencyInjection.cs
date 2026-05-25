using BlotzTask.Modules.UserPushTokens.Commands;

namespace BlotzTask.Modules.UserPushTokens;

public static class DependencyInjection
{
    public static IServiceCollection AddUserPushTokenModule(this IServiceCollection services)
    {
        services.AddScoped<UpsertPushTokenCommandHandler>();
        return services;
    }
}
