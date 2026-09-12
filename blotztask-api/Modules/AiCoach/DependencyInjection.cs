using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Effects;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Kernel;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Domain.Support;
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
            // Product-approved deviation from v3 §17.4.9: Companion is reachable without the
            // proposed Safety layer. Do not describe this registration as safety-complete.
            registry.Register(CompanionModeDefinition.Create());
            return registry;
        });

        services.AddSingleton<PromptModuleRegistry>(_ =>
        {
            var registry = new PromptModuleRegistry();
            registry.Register(ExecutionPromptModules.Profile);
            registry.Register(CompanionPromptModules.LegacyProfile);
            registry.Register(CompanionPromptModules.Profile);
            return registry;
        });

        // ---- Pure domain services (stateless -> singletons) ----
        services.AddSingleton<IConversationKernel, ConversationKernel>();
        services.AddSingleton<IConversationPrePolicy, ConversationPrePolicy>();
        services.AddSingleton<IConversationPostPolicy, ConversationPostPolicy>();
        services.AddSingleton<IPlanningReadinessCalculator, PlanningReadinessCalculator>();
        services.AddSingleton<ISupportPolicyCalculator, SupportPolicyCalculator>();
        services.AddSingleton<IDeterministicProposalGenerator, DeterministicProposalGenerator>();
        services.AddSingleton<IEvidenceGuard, EvidenceGuard>();
        services.AddSingleton<IResponseGuard, ResponseGuard>();
        services.AddSingleton<IProposalSetGuard, ProposalSetGuard>();

        // ---- AI pipeline ----
        services.AddSingleton<IModelPromptAssembler, ModelPromptAssembler>();
        services.AddSingleton<IModelContextBuilder, ModelContextBuilder>();
        services.AddSingleton<IModelGateway, AzureOpenAiModelGateway>();
        services.AddSingleton<IModelTurnRuntime, ModelTurnRuntime>();

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
        services.AddScoped<IConversationEffectHandler, PersistProposalSetEffectHandler>();
        services.AddScoped<IConversationApplication, ConversationApplication>();
        services.AddScoped<StartConversationCommandHandler>();
        services.AddScoped<TranscribeAudioCommandHandler>();
        services.AddScoped<SendMessageCommandHandler>();
        services.AddScoped<ConfirmDraftCommandHandler>();
        services.AddScoped<RejectDraftCommandHandler>();

        // Fail-fast startup validation (v3 §16.1 spirit): a broken registry must stop the app
        // from starting, not surface mid-conversation.
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
    ModeDefinitionRegistry modeRegistry,
    PromptModuleRegistry promptRegistry,
    AiCoachUsageTracker usageTracker) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Forces the usage tracker singleton (and its TEMPORARY projector wiring) to
        // initialize at startup, not on first model call.
        _ = usageTracker;

        promptRegistry.Validate();

        // Every registered mode must resolve its prompt profile — a conversation must never be
        // creatable against an unregistered PromptVersion.
        foreach (var mode in modeRegistry.Definitions)
        {
            if (!promptRegistry.IsRegistered(mode.PromptVersion))
                throw new InvalidOperationException(
                    $"Mode '{mode.Mode}' references unregistered prompt profile '{mode.PromptVersion}'.");
            if (mode.ModelContractSchemaVersion != ModelTurnCandidateContract.SchemaVersion)
                throw new InvalidOperationException(
                    $"Mode '{mode.Mode}' requires model contract schema {mode.ModelContractSchemaVersion}, "
                    + $"but runtime schema {ModelTurnCandidateContract.SchemaVersion} is active.");
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
