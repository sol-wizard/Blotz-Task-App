using BlotzTask.Modules.Challenges.Commands;

namespace BlotzTask.Modules.Challenges;

public static class DependencyInjection
{
    public static IServiceCollection AddChallengeModule(this IServiceCollection services)
    {
        services.AddScoped<CreateChallengeCommandHandler>();
        return services;
    }
}
