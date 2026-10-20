using BlotzTask.Modules.Challenges.Commands;
using BlotzTask.Modules.Challenges.Queries;

namespace BlotzTask.Modules.Challenges;

public static class DependencyInjection
{
    public static IServiceCollection AddChallengeModule(this IServiceCollection services)
    {
        services.AddScoped<CreateChallengeCommandHandler>();
        services.AddScoped<JoinChallengeCommandHandler>();
        services.AddScoped<GetCurrentChallengeQueryHandler>();
        services.AddScoped<GetChallengeHistoryQueryHandler>();
        return services;
    }
}
