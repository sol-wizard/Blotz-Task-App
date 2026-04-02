using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Store;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddScoped<DateTimeResolveService>();

        services.AddSingleton(new ChatHistoryStore(
            TimeSpan.FromMinutes(30),
            TimeSpan.FromMinutes(5)
        ));

        services.Configure<SpeechTokenSettings>(options =>
        {
            configuration.GetSection("AzureSpeech").Bind(options);
        });

        services.AddHttpClient<SpeechTranscriptionService>(client =>
        {
            client.Timeout = TimeSpan.FromMinutes(3);
        });

        return services;
    }
}
