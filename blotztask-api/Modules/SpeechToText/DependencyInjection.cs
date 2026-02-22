using BlotzTask.Modules.SpeechToText.Dtos;
using BlotzTask.Modules.SpeechToText.Services;

namespace BlotzTask.Modules.SpeechToText;

public static class DependencyInjection
{
    // Required to register Speech-to-Text services for token management.
    public static IServiceCollection AddSpeechToTextModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<SpeechTokenSettings>(options =>
        {
            configuration.GetSection("AzureSpeech").Bind(options);
        });

        services.AddHttpClient<SpeechTokenService>(client => { client.Timeout = TimeSpan.FromSeconds(10); });
        services.AddHttpClient<IFastTranscriptionService, FastTranscriptionService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(60);
        });

        services.AddSingleton<SpeechTokenService>();

        return services;
    }
}
