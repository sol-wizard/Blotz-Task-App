using BlotzTask.Modules.MonthlyReviews.Queries;

namespace BlotzTask.Modules.MonthlyReviews;

public static class DependencyInjection
{
    public static IServiceCollection AddMonthlyReviewModule(this IServiceCollection services)
    {
        services.AddScoped<GetMonthlyReviewTaskSnapshotQueryHandler>();
        return services;
    }
}
