using BlotzTask.Modules.Tasks.Commands.SubTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Queries.Tasks;

namespace BlotzTask.Modules.Tasks;

public static class DependencyInjection
{
    public static IServiceCollection AddTaskModule(this IServiceCollection services)
    {
        // Manual registration of command handlers
        services.AddScoped<UpdateSubtaskCommandHandler>();
        services.AddScoped<TaskStatusUpdateCommandHandler>();
        
        // Manual registration of query handlers 
        services.AddScoped<GetTasksByDateQueryHandler>();

        return services;
    }
}