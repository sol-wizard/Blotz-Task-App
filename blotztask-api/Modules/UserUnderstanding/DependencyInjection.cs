using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Queries;

namespace BlotzTask.Modules.UserUnderstanding;

public static class DependencyInjection
{
    public static IServiceCollection AddUserUnderstandingModule(this IServiceCollection services)
    {
        services.AddScoped<GetUserContextQueryHandler>();
        services.AddScoped<GetUserMemoriesQueryHandler>();
        services.AddScoped<RememberUserMemoryCommandHandler>();
        services.AddScoped<ForgetUserMemoryCommandHandler>();
        services.AddScoped<ClearUserMemoriesCommandHandler>();
        return services;
    }
}
