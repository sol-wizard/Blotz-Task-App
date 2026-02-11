using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.SubTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Queries.SubTasks;
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
        services.AddScoped<ReplaceSubtasksCommandHandler>();
        services.AddScoped<DeleteSubtaskCommandHandler>();
        services.AddScoped<AddRecurringTaskCommandHandler>();
        services.AddScoped<UpdateSubtaskStatusCommandHandler>();

        // Manual registration of query handlers 
        services.AddScoped<GetTasksByDateQueryHandler>();
        services.AddScoped<GetTaskByIdQueryHandler>();
        services.AddScoped<GetNoteFloatingTasksQueryHandler>();
        services.AddScoped<GetAllTasksQueryHandler>();
        services.AddScoped<GetSubtasksByTaskIdQueryHandler>();
        services.AddScoped<GetWeeklyTaskAvailabilityQueryHandler>();

        return services;
    }
}