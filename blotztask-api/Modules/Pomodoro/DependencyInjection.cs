using BlotzTask.Modules.Pomodoro.Commands;

namespace BlotzTask.Modules.Pomodoro;

public static class DependencyInjection
{
    public static IServiceCollection AddPomodoroModule(
        this IServiceCollection services)
    {
        // Manual registration of command handlers
        services.AddScoped<UpdatePomodoroSettingCommandHandler>();
        // Manual registration of query handlers 
        return services;
    }
}
