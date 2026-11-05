using BlotzTask.Extension.Options;
using BlotzTask.Modules.Feedback.Commands;
using BlotzTask.Shared.Lark;

namespace BlotzTask.Modules.Feedback;

public static class DependencyInjection
{
    public static IServiceCollection AddFeedbackModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<LarkOptions>()
            .Bind(configuration.GetSection(LarkOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddMemoryCache();
        services.AddHttpClient<ILarkTokenService, LarkTokenService>();
        services.AddHttpClient<ILarkBitableClient, LarkBitableClient>();
        services.AddScoped<SubmitFeedbackCommandHandler>();

        return services;
    }
}
