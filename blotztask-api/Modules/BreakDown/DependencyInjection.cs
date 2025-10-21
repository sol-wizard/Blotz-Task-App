using BlotzTask.Modules.BreakDown.Commands;
using BlotzTask.Modules.BreakDown.Services;

namespace BlotzTask.Modules.BreakDown;

public static class DependencyInjection
{
    public static IServiceCollection AddTaskBreakdownModule(this IServiceCollection services)
    {
        services.AddScoped<ITaskBreakdownService, TaskBreakdownService>();
        services.AddScoped<BreakdownTaskCommandHandler>();

        return services;
    }
}