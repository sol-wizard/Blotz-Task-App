using BlotzTask.Modules.AppVersion.Options;

namespace BlotzTask.Modules.AppVersion;

public static class DependencyInjection
{
    public static IServiceCollection AddAppVersionModule(this IServiceCollection services)
    {
        services.AddOptions<AppVersionOptions>()
            .BindConfiguration("AppVersion");
        return services;
    }
}
