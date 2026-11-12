using BlotzTask.Extension.Options;
using BlotzTask.Modules.Feedback.Commands;
using BlotzTask.Shared.Lark;

namespace BlotzTask.Modules.Feedback;

public static class DependencyInjection
{
    public static IServiceCollection AddFeedbackModule(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var larkOptions = services.AddOptions<LarkOptions>()
            .Bind(configuration.GetSection(LarkOptions.SectionName))
            .ValidateDataAnnotations();

        // Lark is only used to submit in-app feedback. Staging and prod still refuse to start without it,
        // but a local dev without Lark keys can run the API: only POST /api/feedback fails, with the
        // missing setting named in the error.
        if (!environment.IsDevelopment())
            larkOptions.ValidateOnStart();

        services.AddMemoryCache();
        services.AddHttpClient<ILarkTokenService, LarkTokenService>();
        services.AddHttpClient<ILarkBitableClient, LarkBitableClient>();
        services.AddScoped<SubmitFeedbackCommandHandler>();
        services.AddScoped<TranscribeFeedbackCommandHandler>();

        return services;
    }
}
