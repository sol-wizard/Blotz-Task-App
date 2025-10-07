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
        services.AddScoped<AddTaskCommandHandler>();
        services.AddScoped<EditTaskCommandHandler>();
        services.AddScoped<DeleteTaskCommandHandler>();
        services.AddScoped<AddSubtasksCommandHandler>();

        // Manual registration of query handlers 
        services.AddScoped<GetTasksByDateQueryHandler>();
        services.AddScoped<GetTaskByIdQueryHandler>();
        services.AddScoped<GetFloatingTasksQueryHandler>();
        services.AddScoped<GetOverdueTasksQueryHandler>();

        return services;
    }
}