using BlotzTask.Modules.AiCoach.Artifacts;
using BlotzTask.Modules.AiCoach.Capabilities;
using BlotzTask.Modules.AiCoach.Effects;
using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.AiCoach.ModelTurn;
using BlotzTask.Modules.AiCoach.Services;
using BlotzTask.Modules.AiCoach.StateMachine;

namespace BlotzTask.Modules.AiCoach;

public static class DependencyInjection
{
    public static IServiceCollection AddAiCoachModule(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);

        services.AddSingleton<IAiCoachModeDefinitionProvider, ExecuteModeDefinitionProvider>();
        services.AddSingleton<IAiCoachModeDefinitionProvider, ClarifyModeDefinitionProvider>();
        services.AddSingleton<IAiCoachModeDefinitionProvider, CompanionModeDefinitionProvider>();
        services.AddSingleton<IAiCoachModeRegistry, AiCoachModeRegistry>();
        services.AddSingleton<IAiCoachFoundationVersionRegistry, AiCoachFoundationVersionRegistry>();

        foreach (var definition in FoundationCapabilityDefinitions.Create())
        {
            services.AddSingleton<ICapabilityDefinitionProvider>(new FoundationCapabilityDefinitions(definition));
            services.AddTransient(definition.HandlerType);
        }
        services.AddSingleton<ICapabilityRegistry, CapabilityRegistry>();
        services.AddSingleton<ICapabilitySchemaGenerator, ReflectionCapabilitySchemaGenerator>();
        services.AddSingleton<ICapabilityToolSchemaRegistry, CapabilityToolSchemaRegistry>();
        services.AddSingleton<IModelToolsetProjector, ModelToolsetProjector>();
        services.AddSingleton<ICapabilitySchemaValidator, CapabilitySchemaValidator>();
        services.AddSingleton<ICapabilityArgumentBinder, CapabilityArgumentBinder>();
        services.AddScoped<ICapabilityDispatcher, CapabilityDispatcher>();

        services.AddSingleton<IModelTurnInputValidator, FoundationModelTurnInputValidator>();
        services.AddSingleton<IModelExecutionFrameBuilder, FoundationExecutionFrameBuilder>();
        services.AddSingleton<IPromptModuleRegistry, PromptModuleRegistry>();
        services.AddSingleton<IModelPromptAssembler, AiCoachPromptAssembler>();
        services.AddScoped<IModelMemoryPreparer, AiCoachMemoryPreparer>();
        services.AddScoped<IAiCoachModelGateway, AzureOpenAiCoachModelGateway>();
        services.AddSingleton<ICapabilityResultValidator, FoundationCapabilityResultValidator>();
        services.AddSingleton<IModelTurnCompletionPolicy, FoundationModelTurnCompletionPolicy>();
        services.AddScoped<IModelTurnPipeline, ModelTurnPipeline>();

        services.AddSingleton<IArtifactHandler, TaskDraftArtifactHandler>();
        services.AddSingleton<IArtifactRegistry, ArtifactRegistry>();
        services.AddScoped<IArtifactDetailLoader, TaskDraftArtifactDetailLoader>();
        services.AddScoped<IArtifactDetailLoaderRegistry, ArtifactDetailLoaderRegistry>();

        services.AddSingleton<IConversationTransitionHandler, UserMessageReceivedTransitionHandler>();
        services.AddSingleton<IConversationTransitionHandler, ConversationExpiredTransitionHandler>();
        services.AddSingleton<IConversationTransitionHandler, ModelTurnCompletedTransitionHandler>();
        services.AddSingleton<IConversationTransitionHandler, ClarificationRequestedTransitionHandler>();
        services.AddSingleton<IConversationTransitionHandler, ModelGenerationFailedTransitionHandler>();
        services.AddSingleton<IConversationTransitionHandler, QuotaBlockedTransitionHandler>();
        services.AddSingleton<IConversationTransitionHandler, ContentFilteredTransitionHandler>();
        services.AddSingleton<IConversationTransitionRegistry, ConversationTransitionRegistry>();
        services.AddSingleton<IAllowedActionResolver, AllowedActionResolver>();
        services.AddSingleton<IConversationReducer, ConversationReducer>();

        services.AddSingleton<IConversationMutationHandler, AddConversationMessageMutationHandler>();
        services.AddSingleton<IConversationMutationHandler, ExpireConversationMutationHandler>();
        services.AddSingleton<IConversationMutationHandler, AddAssistantMessageMutationHandler>();
        services.AddSingleton<IConversationMutationRegistry, ConversationMutationRegistry>();

        services.AddScoped<IConversationEffectHandler, GenerateModelTurnEffectHandler>();
        services.AddScoped<IConversationEffectDispatcher, ConversationEffectDispatcher>();
        services.AddScoped<IAiConversationStore, AiConversationStore>();
        services.AddScoped<IConversationSnapshotProjector, ConversationSnapshotProjector>();
        services.AddScoped<IAiConversationApplication, AiConversationApplication>();
        services.AddScoped<IAiConversationKernel, AiConversationKernel>();
        services.AddHostedService<AiCoachFoundationStartupValidator>();
        return services;
    }
}

internal sealed class AiCoachFoundationStartupValidator(
    IAiCoachModeRegistry modes,
    ICapabilityRegistry capabilities,
    ICapabilityToolSchemaRegistry toolSchemas,
    IArtifactRegistry artifacts,
    IConversationTransitionRegistry transitions,
    IAiCoachFoundationVersionRegistry versions,
    IServiceProvider services) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        foreach (var mode in modes.All)
        {
            versions.EnsureRegistered(mode);

            foreach (var capabilityId in mode.Capabilities)
            {
                var definition = capabilities.Get(capabilityId);
                if (!definition.AllowedModes.Contains(mode.Mode))
                    throw new InvalidOperationException(
                        $"Mode '{mode.Mode}' references capability '{capabilityId}' which does not allow that mode.");
                foreach (var artifactType in definition.RequiredArtifactTypes)
                    _ = artifacts.Get(artifactType, 1);
            }
        }

        foreach (var definition in capabilities.All)
        {
            _ = services.GetRequiredService(definition.HandlerType);
            var schema = toolSchemas.Get(definition.Id);
            if (schema.InputSchema.ValueKind != System.Text.Json.JsonValueKind.Object)
                throw new InvalidOperationException(
                    $"Capability '{definition.Id}' did not produce an object input schema.");
            if (definition.AllowedInvokers.Contains(CapabilityInvoker.Model)
                && definition.ExecutionSemantics == CapabilityExecutionSemantics.ExternalEffect)
                throw new InvalidOperationException(
                    $"External effect capability '{definition.Id}' cannot be projected as a model tool.");
        }

        if (transitions.Resolve(typeof(UserMessageReceived)) is null
            || transitions.Resolve(typeof(ConversationExpired)) is null
            || transitions.Resolve(typeof(ModelTurnCompleted)) is null
            || transitions.Resolve(typeof(ClarificationRequested)) is null
            || transitions.Resolve(typeof(ModelGenerationFailed)) is null
            || transitions.Resolve(typeof(QuotaBlocked)) is null
            || transitions.Resolve(typeof(ContentFiltered)) is null)
            throw new InvalidOperationException("Foundation conversation transition handlers are incomplete.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
