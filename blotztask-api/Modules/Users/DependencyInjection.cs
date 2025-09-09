using BlotzTask.Modules.Users.Commands;

namespace BlotzTask.Modules.Users;

public static class DependencyInjection
{
    public static IServiceCollection AddUserModule(this IServiceCollection services)
    {
        // Manual registration of command handlers
        services.AddScoped<SyncUserCommandHandler>();
        // Manual registration of query handlers 
        return services;
    }
}