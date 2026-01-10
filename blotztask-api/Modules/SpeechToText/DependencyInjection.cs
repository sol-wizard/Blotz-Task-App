using BlotzTask.Modules.SpeechToText.Dtos;

namespace BlotzTask.Modules.SpeechToText;

public static class DependencyInjection
{
    public static IServiceCollection AddSpeechToTextModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddMemoryCache();

        services.Configure<SpeechTokenSettings>(options =>
        {
            configuration.GetSection("AzureSpeech").Bind(options);
        });

        services.AddHttpClient<SpeechTokenService>(client => { client.Timeout = TimeSpan.FromSeconds(10); });

        services.AddSingleton<SpeechTokenService>();

        return services;
    }
}
