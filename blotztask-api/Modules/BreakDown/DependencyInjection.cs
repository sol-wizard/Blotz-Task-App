using BlotzTask.Modules.BreakDown.Commands;

namespace BlotzTask.Modules.BreakDown;

public static class DependencyInjection
{
    public static IServiceCollection AddTaskBreakdownModule(this IServiceCollection services)
    {
        services.AddScoped<BreakdownTaskCommandHandler>();

        return services;
    }
}