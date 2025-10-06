using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.Queries;

namespace BlotzTask.Modules.Users;

public static class DependencyInjection
{
    public static IServiceCollection AddUserModule(this IServiceCollection services)
    {
        // Manual registration of command handlers
        services.AddScoped<SyncUserCommandHandler>();
        services.AddScoped<GetUserProfileQueryHandler>();
        // Manual registration of query handlers 
        return services;
    }
}