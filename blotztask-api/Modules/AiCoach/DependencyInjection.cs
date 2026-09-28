using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach;

public static class DependencyInjection
{
    public static IServiceCollection AddAiCoachModule(this IServiceCollection services)
    {
        services.AddOptions<AiCoachModuleOptions>()
            .BindConfiguration(AiCoachModuleOptions.SectionName)
            .PostConfigure<IOptions<AzureOpenAIOptions>>((options, azure) =>
            {
                if (string.IsNullOrWhiteSpace(options.DeploymentId))
                    options.DeploymentId = azure.Value.AiModels.TaskGeneration.DeploymentId;
            })
            .Validate(options => options.MaxModelCallsPerTurn >= 2 && options.MaxToolCallsPerTurn > 0 && options.MaxToolArgumentBytes > 0
                && options.ContextTokenBudget >= 8000 && options.MaxOutputTokens > 0
                && options.ModelRequestTimeoutSeconds > 0 && options.ConversationLifetimeHours > 0
                && options.TraceRetentionDays > 0,
                "AiCoach resource limits must be positive and context budget at least 8000.")
            .ValidateOnStart();
        if (services.All(service => service.ServiceType != typeof(TimeProvider)))
            services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IModelGateway, AzureOpenAiModelGateway>();
        services.AddSingleton<ModelContextBuilder>();
        services.AddSingleton<IModelTurnRuntime, ModelTurnRuntime>();
        services.AddSingleton<IConversationStore, InMemoryConversationStore>();
        services.AddSingleton<AiCoachUsageTracker>(provider =>
        {
            var tracker = new AiCoachUsageTracker();
            ConversationSnapshotProjector.UsageTracker = tracker;
            ConversationSnapshotProjector.UsageOptions = provider.GetRequiredService<IOptions<AiCoachModuleOptions>>().Value;
            return tracker;
        });
        services.AddScoped<ConversationApplication>();
        services.AddScoped<AiCoachTraceRecorder>();
        services.AddHostedService<AiCoachTraceRetentionService>();
        services.AddScoped<MessageFeedbackHandler>();
        services.AddScoped<TaskContextReader>();
        services.AddScoped<DraftScheduleChecker>();
        services.AddScoped<StartConversationCommandHandler>();
        services.AddScoped<SendMessageCommandHandler>();
        services.AddScoped<EditDraftCommandHandler>();
        services.AddScoped<ConfirmDraftCommandHandler>();
        services.AddScoped<RejectDraftCommandHandler>();
        services.AddScoped<TranscribeAudioCommandHandler>();
        return services;
    }
}
