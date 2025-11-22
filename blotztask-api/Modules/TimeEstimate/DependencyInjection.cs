using BlotzTask.Modules.TimeEstimate.Commands;

namespace BlotzTask.Modules.TimeEstimate;

public static class DependencyInjection
{
    public static IServiceCollection AddTimeEstimateModule(this IServiceCollection services)
    {
        services.AddScoped<TimeEstimateCommandHandler>();

        return services;
    }
}