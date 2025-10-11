using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Queries;

namespace BlotzTask.Modules.Labels;

public static class DependencyInjection
{
    public static IServiceCollection AddLabelModule(this IServiceCollection services)
    {
        services.AddScoped<AddLabelCommandHandler>();
        services.AddScoped<GetAllLabelsQueryHandler>();
        services.AddScoped<GetLabelTaskCountQueryHandler>();
        services.AddScoped<DeleteCustomLabelCommandHandler>();

        return services;
    }
}
