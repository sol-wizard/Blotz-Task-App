using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator;

public static class DependencyInjection
{
    public static IServiceCollection AddChatTaskGeneratorModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<IAiTaskGenerateService, AiTaskGenerateService>();
        services.AddScoped<DateTimeResolveService>();
        

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
