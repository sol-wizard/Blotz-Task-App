using BlotzTask.Modules.Reviews.Commands;
using BlotzTask.Modules.Reviews.Queries;

namespace BlotzTask.Modules.Reviews;

public static class DependencyInjection
{
    public static IServiceCollection AddReviewModule(this IServiceCollection services)
    {
        services.AddScoped<GenerateReviewCommandHandler>();
        services.AddScoped<GetReviewQueryHandler>();
        return services;
    }
}
