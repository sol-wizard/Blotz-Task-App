using BlotzTask.Modules.Invites.Commands;
using BlotzTask.Modules.Invites.Queries;

namespace BlotzTask.Modules.Invites;

public static class DependencyInjection
{
    public static IServiceCollection AddInviteModule(this IServiceCollection services)
    {
        services.AddScoped<GetMyInviteCodeQueryHandler>();
        services.AddScoped<RedeemInviteCodeCommandHandler>();
        return services;
    }
}
