using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.Dtos;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Modules.Users.Services;

namespace BlotzTask.Modules.Users;

public static class DependencyInjection
{
    public static IServiceCollection AddUserModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<Auth0ManagementSettings>(options =>
        {
            configuration.GetSection("Auth0:Management").Bind(options);
            options.Domain = configuration["Auth0:Domain"];
        });
        services.AddScoped<SyncUserCommandHandler>();
        services.AddScoped<GetUserProfileQueryHandler>();
        services.AddScoped<UpdateUserProfileCommandHandler>();
        services.AddScoped<IAuth0ManagementService, Auth0ManagementService>();
        // Manual registration of query handlers 
        return services;
    }
}