using BlotzTask.Modules.MonthlyReviews.Commands;
using BlotzTask.Modules.MonthlyReviews.Services;

namespace BlotzTask.Modules.MonthlyReviews;

public static class DependencyInjection
{
    public static IServiceCollection AddMonthlyReviewModule(this IServiceCollection services)
    {
        services.AddScoped<IMonthlyReviewAiService, MonthlyReviewAiService>();
        services.AddScoped<GenerateMonthlyReviewCommandHandler>();
        return services;
    }
}
