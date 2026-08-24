using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Ai.ModelTurn;

public sealed record ModelTurnRequest(
    ConversationSnapshot Snapshot,
    Guid EffectId,
    AiCoachModeDefinition Mode,
    IReadOnlyList<ConversationMessage> RecentMessages,
    string TimeZoneId,
    DateTimeOffset UserLocalNow);

public enum ModelTurnCompletionReason
{
    Completed = 0,
    IterationLimitExceeded = 1,
    CapabilityLimitExceeded = 2,
    ContentFiltered = 3,
    InvalidModelResponse = 4,
    TimedOut = 5,
    Cancelled = 6,
    ModelUnavailable = 7,
}

public sealed record ModelTurnResult(
    ModelTurnCompletionReason CompletionReason,
    string? AssistantMessage,
    TaskDraftPayload? ProposedDraft,
    int InputTokens,
    int OutputTokens,
    int TotalTokens);

public interface IModelTurnExecutor
{
    Task<ModelTurnResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// The stable, bounded model tool loop (tech design §21.11). It calls the model, dispatches
/// guarded capabilities strictly in call order, re-projects the execution frame before every
/// continuation, and returns only completion reason + candidate results. It never touches
/// conversation state or the store — the kernel turns its result into events.
///
/// Known model behaviour (validated on the prototype): the model often talks BEFORE calling the
/// tool and again after. Only the LAST assistant text is returned, otherwise users see the plan
/// twice in different words.
/// </summary>
public sealed class ModelTurnExecutor(
    IModelGateway gateway,
    IModelPromptAssembler promptAssembler,
    IModelExecutionFrameBuilder frameBuilder,
    CapabilityRegistry capabilityRegistry,
    ICapabilityDispatcher dispatcher,
    IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnExecutor> logger) : IModelTurnExecutor
{
    public async Task<ModelTurnResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken)
    {
        var limits = options.Value;
        var snapshot = request.Snapshot;
        var turn = new TurnExecutionContext(snapshot, request.EffectId, request.TimeZoneId);

        var toolset = capabilityRegistry.ProjectModelToolset(snapshot.Mode, snapshot.State);
        var prompt = promptAssembler.Assemble(new PromptAssemblyRequest(
            request.Mode.PromptVersion, snapshot.Mode, snapshot.State));

        var transcript = new List<GatewayMessage>();
        foreach (var message in request.RecentMessages)
        {
            transcript.Add(message.Role == ConversationMessageRole.User
                ? new GatewayUserMessage(message.Content)
                : new GatewayAssistantMessage(message.Content, []));
        }

        var iterations = 0;
        var capabilityCalls = 0;
        var schemaCorrections = 0;
        int inputTokens = 0, outputTokens = 0, totalTokens = 0;

        while (iterations < limits.MaxModelIterations)
        {
            iterations++;

            // Re-projected every iteration from the latest TurnView (§21.11 rule 2): once a
            // draft is proposed, the frame both narrows the objective and withdraws the toolset.
            var frame = frameBuilder.Build(snapshot, turn, toolset, request.UserLocalNow, request.TimeZoneId);
            var systemPrompt = string.Join(
                "\n\n",
                new[] { prompt.StaticPrefix, prompt.DynamicSuffix, frame.Render() }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));

            var tools = turn.ProposedDraft is null
                ? CapabilityToolProjector.Project(toolset)
                : [];

            ModelCompletionResult completion;
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(limits.ModelRequestTimeoutSeconds));
                completion = await gateway.CompleteAsync(
                    new ModelGatewayRequest(systemPrompt, transcript, tools),
                    timeout.Token);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return Fail(ModelTurnCompletionReason.Cancelled);
            }
            catch (OperationCanceledException)
            {
                return Fail(ModelTurnCompletionReason.TimedOut);
            }

            inputTokens += completion.InputTokens;
            outputTokens += completion.OutputTokens;
            totalTokens += completion.TotalTokens;

            // Token visibility per gateway call (§27): the whole system prompt + transcript is
            // re-sent every iteration, so per-call numbers show what each resend costs.
            logger.LogInformation(
                "AiCoach model call: conversation {ConversationId} iteration {Iteration} in={InputTokens} out={OutputTokens} toolCalls={ToolCallCount}",
                snapshot.ConversationId, iterations, completion.InputTokens, completion.OutputTokens,
                completion.ToolCalls.Count);

            if (completion.FinishReason == ModelFinishReason.ContentFilter)
                return Fail(ModelTurnCompletionReason.ContentFiltered);

            if (completion.ToolCalls.Count == 0)
            {
                if (string.IsNullOrWhiteSpace(completion.AssistantText))
                    return Fail(ModelTurnCompletionReason.InvalidModelResponse);

                // Final reply — deliberately ONLY the last assistant message.
                return new ModelTurnResult(
                    ModelTurnCompletionReason.Completed,
                    completion.AssistantText.Trim(),
                    turn.ProposedDraft,
                    inputTokens, outputTokens, totalTokens);
            }

            transcript.Add(new GatewayAssistantMessage(completion.AssistantText, completion.ToolCalls));

            // Strictly in the model's original call order, never parallel (§21.11 rule 1).
            foreach (var toolCall in completion.ToolCalls)
            {
                capabilityCalls++;
                if (capabilityCalls > limits.MaxCapabilityCallsPerTurn)
                    return Fail(ModelTurnCompletionReason.CapabilityLimitExceeded);

                var result = dispatcher.Dispatch(toolCall, capabilityCalls, turn, request.Mode);

                if (result.IsCorrectableSchemaError)
                {
                    schemaCorrections++;
                    if (schemaCorrections > limits.MaxSchemaCorrectionAttempts)
                        return Fail(ModelTurnCompletionReason.InvalidModelResponse);
                }

                transcript.Add(new GatewayToolResultMessage(toolCall.Id, result.ToolResultJson));
            }
        }

        logger.LogWarning(
            "Model turn hit iteration limit for conversation {ConversationId} (effect {EffectId})",
            snapshot.ConversationId, request.EffectId);
        return Fail(ModelTurnCompletionReason.IterationLimitExceeded);

        ModelTurnResult Fail(ModelTurnCompletionReason reason) =>
            new(reason, null, null, inputTokens, outputTokens, totalTokens);
    }
}
