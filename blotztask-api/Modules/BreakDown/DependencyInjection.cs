using BlotzTask.Modules.BreakDown.Queries;

namespace BlotzTask.Modules.BreakDown;

public static class DependencyInjection
{
    public static IServiceCollection  AddTaskBreakdownModule(this IServiceCollection services)
    {
        services.AddScoped<BreakdownTaskQueryHandler>();

        return services;
    }
}