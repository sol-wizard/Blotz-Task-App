using BlotzTask.Modules.Pomodoro.Commands;
using BlotzTask.Modules.Pomodoro.Queries;

namespace BlotzTask.Modules.Pomodoro;

public static class DependencyInjection
{
    public static IServiceCollection AddPomodoroModule(
        this IServiceCollection services)
    {
        // Manual registration of command handlers
        services.AddScoped<UpdatePomodoroSettingCommandHandler>();
        // Manual registration of query handlers 
        services.AddScoped<GetPomodoroSettingQueryHandler>();
        return services;
    }
}
