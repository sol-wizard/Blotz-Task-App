using BlotzTask.Modules.BreakDown.Commands;
using BlotzTask.Modules.BreakDown.Queries;
using BlotzTask.Modules.BreakDown.Services;

namespace BlotzTask.Modules.BreakDown;

public static class DependencyInjection
{
    public static IServiceCollection AddTaskBreakdownModule(this IServiceCollection services)
    {
        services.AddScoped<BreakdownTaskCommandHandler>();
        services.AddScoped<BreakdownAndReplaceTaskCommandHandler>();
        services.AddScoped<StartTaskBreakdownCommandHandler>();
        services.AddScoped<RunTaskBreakdownJobCommandHandler>();
        services.AddScoped<GetTaskBreakdownStatusQueryHandler>();
        services.AddScoped<BreakdownTargetResolver>();
        services.AddSingleton<BreakdownJobQueue>();
        services.AddHostedService<BreakdownJobRunner>();

        return services;
    }
}
