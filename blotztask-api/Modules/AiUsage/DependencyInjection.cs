namespace BlotzTask.Modules.AiUsage;

using BlotzTask.Modules.AiUsage.Queries;


public static class DependencyInjection
{
    public static IServiceCollection AddAiUsageModule(this IServiceCollection services)
    {
        services.AddScoped<GetAiUsageSummaryQueryHandler>();

        return services;
    }
}