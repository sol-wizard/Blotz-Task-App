using System.Text.Json;
using BlotzTask.Modules.AiCoach.Capabilities;

namespace BlotzTask.Modules.AiCoach.ModelTurn;

public sealed record ModelTurnValidationResult(bool Accepted, string? RejectionCode)
{
    public static ModelTurnValidationResult Allow { get; } = new(true, null);
    public static ModelTurnValidationResult Reject(string code) => new(false, code);
}

public interface IModelTurnInputValidator
{
    ModelTurnValidationResult Validate(ModelTurnRequest request);
}

public interface IModelExecutionFrameBuilder
{
    ModelExecutionFrame Build(ModelTurnRequest request, TurnView turn);
}

public interface IModelPromptAssembler
{
    AssembledModelPrompt Assemble(ModelTurnRequest request, ModelExecutionFrame frame);
}

public interface IModelMemoryPreparer
{
    Task<PreparedMemoryContext> PrepareAsync(
        ModelTurnRequest request,
        TurnView turn,
        CancellationToken cancellationToken);
}

public interface IAiCoachModelGateway
{
    Task<ModelGatewayResponse> GenerateAsync(
        ModelGatewayRequest request,
        CancellationToken cancellationToken);
}

public interface ICapabilityResultValidator
{
    ModelTurnValidationResult Validate(
        CapabilityDefinition definition,
        object result,
        ProposedArtifactChange? proposal,
        TurnView turn);
}

public interface ICapabilityExecutionObserver
{
    Task ObserveAsync(
        CapabilityExecutionRecord execution,
        CancellationToken cancellationToken);
}

public enum ModelTurnCompletionDecision { Complete, Continue, Fail }

public interface IModelTurnCompletionPolicy
{
    ModelTurnCompletionDecision Decide(
        ModelTurnRequest request,
        ModelGatewayResponse response,
        TurnView turn);
}

public interface IModelTurnObserver
{
    Task ObserveAsync(ModelTurnResult result, CancellationToken cancellationToken);
}

public interface IModelTurnPipeline
{
    Task<ModelTurnResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken);
}

public sealed class ModelTurnPipeline(
    IEnumerable<IModelTurnInputValidator> inputValidators,
    IModelExecutionFrameBuilder frameBuilder,
    IModelPromptAssembler promptAssembler,
    IModelMemoryPreparer memoryPreparer,
    IAiCoachModelGateway gateway,
    IModelToolsetProjector toolsets,
    ICapabilityRegistry capabilities,
    ICapabilityArgumentBinder argumentBinder,
    ICapabilityDispatcher capabilityDispatcher,
    IEnumerable<ICapabilityResultValidator> resultValidators,
    IEnumerable<ICapabilityExecutionObserver> capabilityObservers,
    IModelTurnCompletionPolicy completionPolicy,
    IEnumerable<IModelTurnObserver> turnObservers,
    ILogger<ModelTurnPipeline> logger) : IModelTurnPipeline
{
    public async Task<ModelTurnResult> ExecuteAsync(
        ModelTurnRequest request,
        CancellationToken cancellationToken)
    {
        var turn = new TurnView(request.Snapshot);
        foreach (var validator in inputValidators)
        {
            var validation = validator.Validate(request);
            if (!validation.Accepted)
                return await CompleteAsync(
                    new ModelTurnResult(
                        ModelTurnCompletionReason.InvalidInput,
                        null,
                        turn,
                        0,
                        validation.RejectionCode),
                    turnObservers,
                    cancellationToken);
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(request.Limits.RequestTimeout);

        var toolExchanges = new List<ModelToolExchange>();
        var iterations = 0;
        var capabilityCalls = 0;
        var schemaCorrections = 0;

        try
        {
            while (iterations < request.Limits.MaxModelIterations)
            {
                iterations++;
                var frame = frameBuilder.Build(request, turn);
                var prompt = promptAssembler.Assemble(request, frame);
                var memory = await memoryPreparer.PrepareAsync(request, turn, timeout.Token);
                var tools = toolsets.Project(
                    request.Mode,
                    request.Snapshot.State,
                    turn.CurrentArtifact?.Type,
                    request.Purpose,
                    request.Objective);

                var response = await gateway.GenerateAsync(
                    new ModelGatewayRequest(
                        request.Snapshot.UserId,
                        prompt,
                        frame,
                        memory,
                        tools,
                        toolExchanges),
                    timeout.Token);

                if (response.FailureCode is not null)
                {
                    var reason = response.FailureCode switch
                    {
                        "model_gateway_not_configured" => ModelTurnCompletionReason.ConfigurationError,
                        "quota_exceeded" => ModelTurnCompletionReason.QuotaExceeded,
                        "content_filtered" => ModelTurnCompletionReason.ContentFiltered,
                        "rate_limited" => ModelTurnCompletionReason.RateLimited,
                        "empty_model_response"
                            or "invalid_model_response"
                            or "clarification_missing_field_required"
                            or "clarification_must_contain_one_question"
                            or "reply_cannot_declare_missing_field"
                            or "invalid_schedule_recommendation" => ModelTurnCompletionReason.InvalidInput,
                        _ => ModelTurnCompletionReason.ModelUnavailable
                    };
                    return await CompleteAsync(
                        new ModelTurnResult(reason, null, turn, iterations, response.FailureCode),
                        turnObservers,
                        cancellationToken);
                }

                if (response.ToolCalls.Count > 1)
                    return await CompleteAsync(
                        new ModelTurnResult(
                            ModelTurnCompletionReason.CapabilityRejected,
                            null,
                            turn,
                            iterations,
                            "multiple_capability_calls_not_allowed"),
                        turnObservers,
                        cancellationToken);
                if (response.ToolCalls.Count > 0
                    && (response.IsComplete || response.Outcome is not null))
                    return await CompleteAsync(
                        new ModelTurnResult(
                            ModelTurnCompletionReason.CapabilityRejected,
                            null,
                            turn,
                            iterations,
                            "tool_continuation_invalid"),
                        turnObservers,
                        cancellationToken);

                var schemaCorrectionRequested = false;
                foreach (var toolCall in response.ToolCalls)
                {
                    if (turn.ProposedArtifact is not null)
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.CapabilityRejected,
                                null,
                                turn,
                                iterations,
                                "artifact_already_proposed_in_current_turn"),
                            turnObservers,
                            cancellationToken);
                    if (string.IsNullOrWhiteSpace(toolCall.ProviderCallId)
                        || toolExchanges.Any(exchange =>
                            exchange.Call.ProviderCallId == toolCall.ProviderCallId))
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.CapabilityRejected,
                                null,
                                turn,
                                iterations,
                                "tool_continuation_invalid"),
                            turnObservers,
                            cancellationToken);

                    capabilityCalls++;
                    var invocationIndex = capabilityCalls;
                    if (capabilityCalls > request.Limits.MaxCapabilityCalls)
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.CapabilityLimitExceeded,
                                null,
                                turn,
                                iterations,
                                "capability_limit_exceeded"),
                            turnObservers,
                            cancellationToken);

                    var tool = tools.SingleOrDefault(item => item.Name == toolCall.ToolName);
                    if (tool is null)
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.CapabilityRejected,
                                null,
                                turn,
                                iterations,
                                "unknown_capability"),
                            turnObservers,
                            cancellationToken);

                    var definition = capabilities.Get(tool.CapabilityId);
                    object input;
                    try
                    {
                        input = argumentBinder.Bind(definition, toolCall.Arguments);
                    }
                    catch (JsonException)
                    {
                        schemaCorrections++;
                        if (schemaCorrections > request.Limits.MaxSchemaCorrectionAttempts)
                            return await CompleteAsync(
                                new ModelTurnResult(
                                    ModelTurnCompletionReason.CapabilityRejected,
                                    null,
                                    turn,
                                    iterations,
                                    "schema_correction_limit_exceeded"),
                                turnObservers,
                                cancellationToken);

                        toolExchanges.Add(new ModelToolExchange(
                            toolCall,
                            new ModelToolResult(
                                invocationIndex,
                                toolCall.ToolName,
                                false,
                                null,
                                "schema_validation_failed")));
                        schemaCorrectionRequested = true;
                        break;
                    }

                    try
                    {
                        var proposals = new ProposedArtifactBuffer();
                        var context = new CapabilityExecutionContext(
                            CapabilityInvoker.Model,
                            request.Mode,
                            request.Snapshot,
                            turn,
                            proposals,
                            request.ConsentEvidence,
                            invocationIndex);
                        var output = await capabilityDispatcher.DispatchAsync(
                            definition.Id,
                            input,
                            context,
                            timeout.Token);

                        foreach (var validator in resultValidators)
                        {
                            var validation = validator.Validate(
                                definition,
                                output,
                                proposals.Artifact,
                                turn);
                            if (!validation.Accepted)
                                throw new CapabilityRejectedException(
                                    validation.RejectionCode ?? "capability_result_invalid",
                                    definition.Id);
                        }

                        proposals.Commit(turn);
                        turn.RecordExecution(new CapabilityExecutionRecord(
                            invocationIndex,
                            definition.Id,
                            true,
                            null));

                        var execution = turn.Executions.Single(item =>
                            item.InvocationIndex == invocationIndex);
                        foreach (var observer in capabilityObservers)
                        {
                            try
                            {
                                await observer.ObserveAsync(execution, timeout.Token);
                            }
                            catch (Exception exception)
                            {
                                logger.LogWarning(
                                    exception,
                                    "AI Coach capability observer failed for {CapabilityId} at invocation {InvocationIndex}",
                                    definition.Id,
                                    invocationIndex);
                            }
                        }

                        toolExchanges.Add(new ModelToolExchange(
                            toolCall,
                            new ModelToolResult(
                                invocationIndex,
                                toolCall.ToolName,
                                true,
                                JsonSerializer.SerializeToElement(new
                                {
                                    candidateArtifactId = proposals.Artifact?.ArtifactId,
                                    candidateStatus = "validated_for_current_turn",
                                    persisted = false,
                                    formalTaskCreated = false
                                }, CapabilityJsonContract.Options),
                                null)));
                    }
                    catch (CapabilityRejectedException exception)
                    {
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.CapabilityRejected,
                                null,
                                turn,
                                iterations,
                                exception.Code),
                            turnObservers,
                            cancellationToken);
                    }
                    catch (ModelTurnViolationException exception)
                    {
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.CapabilityRejected,
                                null,
                                turn,
                                iterations,
                                exception.Code),
                            turnObservers,
                            cancellationToken);
                    }
                    catch (NotSupportedException)
                    {
                        return await CompleteAsync(
                            new ModelTurnResult(
                                ModelTurnCompletionReason.ConfigurationError,
                                null,
                                turn,
                                iterations,
                                "capability_not_implemented"),
                            turnObservers,
                            cancellationToken);
                    }
                }

                if (schemaCorrectionRequested)
                    continue;

                var decision = completionPolicy.Decide(request, response, turn);
                if (decision == ModelTurnCompletionDecision.Complete)
                    return await CompleteAsync(
                        new ModelTurnResult(
                            ModelTurnCompletionReason.Completed,
                            response.Outcome,
                            turn,
                            iterations,
                            null),
                        turnObservers,
                        cancellationToken);
                if (decision == ModelTurnCompletionDecision.Fail)
                    return await CompleteAsync(
                        new ModelTurnResult(
                            ModelTurnCompletionReason.InvalidInput,
                            null,
                            turn,
                            iterations,
                            "invalid_model_response"),
                        turnObservers,
                        cancellationToken);
            }

            return await CompleteAsync(
                new ModelTurnResult(
                    ModelTurnCompletionReason.IterationLimitExceeded,
                    null,
                    turn,
                    iterations,
                    "iteration_limit_exceeded"),
                turnObservers,
                cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return await CompleteAsync(
                new ModelTurnResult(
                    ModelTurnCompletionReason.TimedOut,
                    null,
                    turn,
                    iterations,
                    "model_turn_timed_out"),
                turnObservers,
                CancellationToken.None);
        }
        catch (OperationCanceledException)
        {
            return await CompleteAsync(
                new ModelTurnResult(
                    ModelTurnCompletionReason.Cancelled,
                    null,
                    turn,
                    iterations,
                    "model_turn_cancelled"),
                turnObservers,
                CancellationToken.None);
        }
    }

    private async Task<ModelTurnResult> CompleteAsync(
        ModelTurnResult result,
        IEnumerable<IModelTurnObserver> observers,
        CancellationToken cancellationToken)
    {
        foreach (var observer in observers)
        {
            try
            {
                await observer.ObserveAsync(result, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(
                    exception,
                    "AI Coach turn observer failed after completion reason {CompletionReason}",
                    result.CompletionReason);
            }
        }
        return result;
    }
}

public sealed class FoundationModelTurnInputValidator : IModelTurnInputValidator
{
    public ModelTurnValidationResult Validate(ModelTurnRequest request)
    {
        if (request.EffectId == Guid.Empty)
            return ModelTurnValidationResult.Reject("effect_id_required");
        if (request.Snapshot.ConversationId == Guid.Empty
            || request.Snapshot.Mode != request.Mode.Mode)
            return ModelTurnValidationResult.Reject("conversation_context_invalid");
        if (request.Mode.Mode != Domain.AiCoachMode.Execute
            || request.TriggeringEvent is not StateMachine.UserMessageReceived
            || request.Snapshot.State is not (Domain.ConversationState.Conversing
                or Domain.ConversationState.Clarifying)
            || !IsSupportedObjective(request.Purpose, request.Objective))
            return ModelTurnValidationResult.Reject("model_turn_objective_not_supported");
        if (request.Snapshot.CurrentArtifact is not null)
            return ModelTurnValidationResult.Reject("model_turn_current_artifact_not_supported");
        if (request.Limits.MaxModelIterations < 1
            || request.Limits.MaxCapabilityCalls < 0
            || request.Limits.MaxSchemaCorrectionAttempts < 0
            || request.Limits.RequestTimeout <= TimeSpan.Zero)
            return ModelTurnValidationResult.Reject("model_turn_limits_invalid");
        return ModelTurnValidationResult.Allow;
    }

    private static bool IsSupportedObjective(ModelPurpose purpose, TurnObjectiveKey objective) =>
        (purpose, objective) is
            (ModelPurpose.Clarification, TurnObjectiveKey.ClarifyOneCoreRequirement)
            or (ModelPurpose.TaskDraft, TurnObjectiveKey.ProposeOneOffTaskDraft);
}

public sealed class FoundationExecutionFrameBuilder(
    IModelToolsetProjector tools) : IModelExecutionFrameBuilder
{
    public ModelExecutionFrame Build(ModelTurnRequest request, TurnView turn)
    {
        var allowed = tools.Project(
                request.Mode,
                request.Snapshot.State,
                turn.CurrentArtifact?.Type,
                request.Purpose,
                request.Objective)
            .Select(tool => tool.CapabilityId)
            .ToHashSet();
        var invariants = new HashSet<ModelInvariantKey>
        {
            ModelInvariantKey.OneQuestionPerTurn,
            ModelInvariantKey.NoSilentSchedule,
            ModelInvariantKey.NoBusinessSideEffects,
            ModelInvariantKey.StateIsServerControlled
        };
        if (request.Purpose == ModelPurpose.Clarification)
            invariants.Add(ModelInvariantKey.NoArtifact);
        else
        {
            invariants.Add(ModelInvariantKey.AtMostOneProposedArtifact);
            invariants.Add(ModelInvariantKey.ProposedArtifactIsNotFormalTask);
        }

        return new ModelExecutionFrame(
            request.Mode.ExecutionFrameVersion,
            request.Snapshot.ConversationId,
            request.Snapshot.Version,
            request.Snapshot.Mode,
            request.Snapshot.State,
            request.Purpose,
            request.Objective,
            invariants,
            allowed,
            turn.CurrentArtifact);
    }
}

public sealed class UnconfiguredAiCoachModelGateway : IAiCoachModelGateway
{
    public Task<ModelGatewayResponse> GenerateAsync(
        ModelGatewayRequest request,
        CancellationToken cancellationToken) =>
        Task.FromResult(new ModelGatewayResponse(null, [], false, "model_gateway_not_configured"));
}

public sealed class FoundationCapabilityResultValidator : ICapabilityResultValidator
{
    public ModelTurnValidationResult Validate(
        CapabilityDefinition definition,
        object result,
        ProposedArtifactChange? proposal,
        TurnView turn) =>
        result.GetType() == definition.OutputType
            ? ModelTurnValidationResult.Allow
            : ModelTurnValidationResult.Reject("capability_output_contract_mismatch");
}

public sealed class FoundationModelTurnCompletionPolicy : IModelTurnCompletionPolicy
{
    public ModelTurnCompletionDecision Decide(
        ModelTurnRequest request,
        ModelGatewayResponse response,
        TurnView turn)
    {
        if (!response.IsComplete && response.ToolCalls.Count > 0)
            return ModelTurnCompletionDecision.Continue;
        if (!response.IsComplete || response.ToolCalls.Count > 0 || response.Outcome is null)
            return ModelTurnCompletionDecision.Fail;

        if (request.Purpose == ModelPurpose.Clarification)
            return turn.ProposedArtifact is null
                && response.Outcome.Kind == ControlledModelOutcomeKind.Clarification
                ? ModelTurnCompletionDecision.Complete
                : ModelTurnCompletionDecision.Fail;

        if (request.Purpose == ModelPurpose.TaskDraft)
        {
            if (turn.ProposedArtifact is null)
                return response.Outcome.Kind == ControlledModelOutcomeKind.Clarification
                    ? ModelTurnCompletionDecision.Complete
                    : ModelTurnCompletionDecision.Fail;

            return response.Outcome.Kind == ControlledModelOutcomeKind.Reply
                && !DeclaresFormalPersistence(response.Outcome.AssistantMessage)
                ? ModelTurnCompletionDecision.Complete
                : ModelTurnCompletionDecision.Fail;
        }

        return ModelTurnCompletionDecision.Fail;
    }

    private static bool DeclaresFormalPersistence(string message)
    {
        var normalized = message.Trim().ToLowerInvariant();
        string[] forbiddenClaims =
        [
            "task has been created", "task was created", "task is saved",
            "task has been saved", "正式任务已创建", "任务已创建", "任务已保存"
        ];
        return forbiddenClaims.Any(normalized.Contains);
    }
}
