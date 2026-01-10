namespace BlotzTask.Modules.SpeechToText;

public static class DependencyInjection
{
    public static IServiceCollection AddSpeechToTextModule(
        this IServiceCollection services)
    {
        services.AddMemoryCache();

        services.AddHttpClient<SpeechTokenService>(client => { client.Timeout = TimeSpan.FromSeconds(10); });

        services.AddSingleton<SpeechTokenService>();

        return services;
    }
}