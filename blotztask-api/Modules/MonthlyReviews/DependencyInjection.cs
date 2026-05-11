using BlotzTask.Modules.MonthlyReviews.Commands;

namespace BlotzTask.Modules.MonthlyReviews;

public static class DependencyInjection
{
    public static IServiceCollection AddMonthlyReviewModule(this IServiceCollection services)
    {
        services.AddScoped<GenerateMonthlyReviewCommandHandler>();
        return services;
    }
}
