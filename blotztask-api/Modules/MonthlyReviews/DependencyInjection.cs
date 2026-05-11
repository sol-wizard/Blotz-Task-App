using BlotzTask.Modules.MonthlyReviews.Queries;
using BlotzTask.Modules.MonthlyReviews.Services;

namespace BlotzTask.Modules.MonthlyReviews;

public static class DependencyInjection
{
    public static IServiceCollection AddMonthlyReviewModule(this IServiceCollection services)
    {
        services.AddScoped<GetMonthlyReviewTaskSnapshotQueryHandler>();
        services.AddScoped<IMonthlyReviewAiService, MonthlyReviewAiService>();
        return services;
    }
}
