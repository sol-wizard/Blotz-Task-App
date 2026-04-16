using BlotzTask.Modules.AiUsage.Queries;
using BlotzTask.Modules.AiUsage.Services;

namespace BlotzTask.Modules.AiUsage;

public static class DependencyInjection
{
    public static IServiceCollection AddAiUsageModule(this IServiceCollection services)
    {
        services.AddScoped<ICheckAiQuotaService, CheckAiQuotaService>();
        services.AddScoped<IRecordAiUsageService, RecordAiUsageService>();
        services.AddScoped<GetAiUsageSummaryQueryHandler>();

        return services;
    }
}
