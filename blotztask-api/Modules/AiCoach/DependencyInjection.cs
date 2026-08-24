using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.ModelTurn;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Effects;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Rules;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach;

public static class DependencyInjection
{
    public static IServiceCollection AddAiCoachModule(this IServiceCollection services)
    {
        // Options: AiCoach section; DeploymentId falls back to the TaskGeneration deployment.
        services.AddOptions<AiCoachModuleOptions>()
            .BindConfiguration(AiCoachModuleOptions.SectionName)
            .PostConfigure<IOptions<AzureOpenAIOptions>>((options, azure) =>
            {
                if (string.IsNullOrWhiteSpace(options.DeploymentId))
                    options.DeploymentId = azure.Value.AiModels.TaskGeneration.DeploymentId;
            });

        services.TryAddTimeProvider();

        // ---- Registries (singletons, validated at startup by AiCoachStartupValidator) ----
        services.AddSingleton<ModeDefinitionRegistry>(_ =>
        {
            var registry = new ModeDefinitionRegistry();
            registry.Register(ExecutionModeDefinition.Create());
            return registry;
        });

        services.AddSingleton<CapabilityRegistry>(_ =>
        {
            var registry = new CapabilityRegistry();
            // The ONLY model capability in v1: one call proposes the whole draft card (1..N
            // one-off tasks, product decision 2026-08-22). Unlike the old ChatTaskGenerator
            // "CreateTasks", nothing is saved here — the card is a candidate the user confirms.
            registry.Register(new CapabilityDefinition(
                Id: CapabilityId.DraftOneOffCreate,
                CapabilityVersion: 1,
                InputSchemaVersion: CreateTaskDraftsHandler.SchemaVersion,
                OutputSchemaVersion: 1,
                AllowedInvokers: new HashSet<CapabilityInvoker> { CapabilityInvoker.Model },
                AllowedModes: new HashSet<AiCoachMode> { AiCoachMode.Execution },
                // DraftPending is deliberately included: a create request with a pending draft
                // must reach the domain-invariant check and return PendingDraftAlreadyExists
                // (§19.3), not a generic state rejection.
                AllowedStates: new HashSet<ConversationState>
                {
                    ConversationState.Conversing,
                    ConversationState.Clarifying,
                    ConversationState.DraftPending,
                },
                AllowedCurrentArtifacts: new HashSet<ArtifactType> { ArtifactType.TaskDraft },
                ConsentRequirement: ConsentRequirement.None,
                ExecutionSemantics: CapabilityExecutionSemantics.ProposesArtifact,
                ConcurrencyPolicy: CapabilityConcurrencyPolicy.SequentialOnly,
                ToolName: CapabilityToolProjector.DraftToolName,
                ToolDescription: CapabilityToolProjector.DraftToolDescription,
                InputType: typeof(CreateTaskDraftsInput),
                HandlerType: typeof(CreateTaskDraftsHandler)));
            return registry;
        });

        services.AddSingleton<PromptModuleRegistry>(_ =>
        {
            var registry = new PromptModuleRegistry();
            registry.Register(ExecutionPromptModules.Profile);
            return registry;
        });

        // ---- Domain services (stateless -> singletons) ----
        services.AddSingleton<IConversationReducer, ConversationReducer>();
        services.AddSingleton<ICapabilityGuard, CapabilityGuard>();
        services.AddSingleton<CreateTaskDraftsHandler>();

        // ---- AI pipeline ----
        services.AddSingleton<IModelPromptAssembler, ModelPromptAssembler>();
        services.AddSingleton<IModelExecutionFrameBuilder, ExecutionModeFrameBuilder>();
        services.AddSingleton<ICapabilityDispatcher, CapabilityDispatcher>();
        services.AddSingleton<IModelGateway, AzureOpenAiModelGateway>();
        services.AddSingleton<IModelTurnExecutor, ModelTurnExecutor>();

        services.AddSingleton<AiCoachUsageTracker>(sp =>
        {
            var tracker = new AiCoachUsageTracker();
            // TEMPORARY debug-usage wiring (see ConversationSnapshotDto.DebugUsage).
            ConversationSnapshotProjector.UsageTracker = tracker;
            ConversationSnapshotProjector.UsageOptions =
                sp.GetRequiredService<IOptions<AiCoachModuleOptions>>().Value;
            return tracker;
        });

        // ---- Store (in-memory v1; see IConversationStore for the swap path) ----
        services.AddSingleton<IConversationStore, InMemoryConversationStore>();

        // ---- Application (scoped: effect handlers depend on scoped DB-backed services) ----
        services.AddScoped<IConversationEffectHandler, GenerateModelTurnEffectHandler>();
        services.AddScoped<IConversationEffectHandler, PersistDraftEffectHandler>();
        services.AddScoped<IConversationKernel, ConversationKernel>();
        services.AddScoped<StartConversationCommandHandler>();
        services.AddScoped<TranscribeAudioCommandHandler>();
        services.AddScoped<SendMessageCommandHandler>();
        services.AddScoped<ConfirmDraftCommandHandler>();
        services.AddScoped<RejectDraftCommandHandler>();

        // Fail-fast startup validation (tech design §21.12): a broken registry must stop the
        // app from starting, not surface mid-conversation.
        services.AddHostedService<AiCoachStartupValidator>();

        return services;
    }

    private static void TryAddTimeProvider(this IServiceCollection services)
    {
        if (services.All(s => s.ServiceType != typeof(TimeProvider)))
            services.AddSingleton(TimeProvider.System);
    }
}

public sealed class AiCoachStartupValidator(
    IServiceProvider services,
    CapabilityRegistry capabilityRegistry,
    ModeDefinitionRegistry modeRegistry,
    PromptModuleRegistry promptRegistry,
    // ReSharper disable once UnusedParameter.Local — forces the usage tracker singleton (and
    // its TEMPORARY projector wiring) to initialize at startup, not on first model call.
    AiCoachUsageTracker usageTracker) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = services.CreateScope();
        capabilityRegistry.Validate(scope.ServiceProvider, modeRegistry.Definitions.ToList());
        promptRegistry.Validate();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
