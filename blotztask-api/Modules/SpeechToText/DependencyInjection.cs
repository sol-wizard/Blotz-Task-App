using BlotzTask.Modules.SpeechToText.Dtos;
using BlotzTask.Modules.SpeechToText.Services;

namespace BlotzTask.Modules.SpeechToText;

public static class DependencyInjection
{
    // Required to register Speech-to-Text services.
    public static IServiceCollection AddSpeechToTextModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<SpeechTokenSettings>(options =>
        {
            configuration.GetSection("AzureSpeech").Bind(options);
        });

        services.AddHttpClient<SpeechTranscriptionService>(client => { client.Timeout = TimeSpan.FromMinutes(3); });

        return services;
    }
}
