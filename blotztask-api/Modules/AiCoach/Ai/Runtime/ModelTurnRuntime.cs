using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using static BlotzTask.Modules.AiCoach.Ai.Runtime.ModelContextBuilder;
using BlotzTask.Modules.AiCoach.Application.Projections;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

public sealed record ModelTurnRequest(Guid ConversationId, IReadOnlyList<GatewayMessage> History,
    IReadOnlyList<ProposalSet> Drafts, string TimeZoneId, DateTimeOffset LocalNow,
    string? Summary, int SummarizedMessageCount,
    Func<DateOnly, DateOnly, CancellationToken, Task<string>>? ReadTasks = null,
    Func<IReadOnlyList<TaskProposal>, CancellationToken, Task<ScheduleAssessment>>? CheckSchedule = null,
    Func<string, object, Task>? Trace = null, string? PreviousClosingSummary = null,
    DateTimeOffset? SegmentStartedAt = null, string? SegmentStartTimeZoneId = null,
    bool ReviewListEnabled = false,
    Func<string, object, Task>? Stream = null, string? UserContext = null, MemoryTools? MemoryTools = null);

public sealed record ModelTurnRunResult(string? Text, string? Error,
    IReadOnlyList<GatewayMessage> TurnHistory, IReadOnlyList<ProposalSet> Drafts,
    string? Summary, int SummarizedMessageCount,
    int InputTokens, int OutputTokens, int TotalTokens, int ModelCallCount,
    bool TaskContextRead = false, IReadOnlyList<string>? FollowUps = null, int CachedInputTokens = 0,
    AiCoachModelProfile? Model = null, decimal? EstimatedUsd = null);

public interface IModelTurnRuntime
{
    Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken ct);
}

public sealed class ModelTurnRuntime(IModelGateway gateway, IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnRuntime> logger, ModelContextBuilder contextBuilder,
    IHostEnvironment? environment = null) : IModelTurnRuntime
{

    public async Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken ct)
    {
        var limits = options.Value;
        var turnGateway = gateway.OpenTurn();
        var model = turnGateway.Profile;
        decimal? estimatedUsd = 0;
        logger.LogInformation(
            "AiCoach model turn started for {ConversationId} with {HistoryMessageCount} history messages and {DraftCount} drafts",
            request.ConversationId, request.History.Count, request.Drafts.Count);
        var workspace = new DraftTools(request.Drafts, request.TimeZoneId, request.ReviewListEnabled);
        var executor = new ToolExecutor(workspace, limits, request.ReadTasks, request.CheckSchedule, request.MemoryTools);
        var turn = new List<GatewayMessage>();
        // Schedule reads are shortened only in durable history, never in the active model turn.
        var liveTurn = new List<GatewayMessage>();
        var summary = request.Summary;
        var covered = request.SummarizedMessageCount;
        var calls = 0;
        var toolCalls = 0;
        var input = 0;
        var cachedInput = 0;
        var output = 0;
        var total = 0;
        var taskContextRead = false;
        try
        {
            var context = await contextBuilder.BuildAsync(request, executor.AvailableTools, Call);
            var system = context.SystemPrompt;
            var transcript = context.Transcript;
            summary = context.Summary;
            covered = context.SummarizedMessageCount;

            while (calls < limits.MaxModelCallsPerTurn)
            {
                // Tool execution mutates only the workspace. Rebuild the model projection with one
                // current draft snapshot while leaving raw turn results intact for commit and traces.
                transcript = contextBuilder.BuildTurnTranscript(context, liveTurn, workspace.Drafts);
                if (liveTurn.Count > 0 && !contextBuilder.FitsBudget(system, transcript, executor.AvailableTools))
                {
                    var projectedTurn = contextBuilder.BuildTurnTranscript(context with { Transcript = [] },
                        liveTurn, workspace.Drafts).Take(liveTurn.Count);
                    var turnBytes = Size(projectedTurn);
                    context = await contextBuilder.BuildAsync(request with
                    {
                        Drafts = workspace.Drafts, Summary = summary, SummarizedMessageCount = covered,
                    }, executor.AvailableTools, Call, turnBytes);
                    system = context.SystemPrompt;
                    summary = context.Summary;
                    covered = context.SummarizedMessageCount;
                    transcript = contextBuilder.BuildTurnTranscript(context, liveTurn, workspace.Drafts);
                }
                if (!contextBuilder.FitsBudget(system, transcript, executor.AvailableTools))
                {
                    logger.LogWarning("AiCoach context limit reached for {ConversationId} before model call {ModelCallNumber}",
                        request.ConversationId, calls + 1);
                    return Result(null, "context_limit");
                }
                var lastCall = calls == limits.MaxModelCallsPerTurn - 1 || executor.BudgetExhausted;
                await Emit("reply.reset", new { });
                var filter = request.Stream is null ? null : new FollowUpStreamFilter(text => Emit("reply.delta", new { text }));
                var completion = await Call(new ModelGatewayRequest(system, transcript,
                    lastCall ? [] : executor.AvailableTools, MaxOutputTokens: model?.MaxOutputTokens ?? limits.MaxOutputTokens,
                    OnTextDelta: filter is null ? null : filter.WriteAsync));
                if (filter is not null) await filter.FlushAsync();
                if (completion.FinishReason == ModelFinishReason.ContentFilter)
                {
                    logger.LogWarning("AiCoach response filtered for {ConversationId}", request.ConversationId);
                    return Result(null, "content_filtered");
                }
                if (completion.FinishReason == ModelFinishReason.Length)
                {
                    logger.LogWarning("AiCoach output limit reached for {ConversationId}", request.ConversationId);
                    return Result(null, "output_limit");
                }
                if (completion.ToolCalls.Count == 0)
                {
                    var (finalReply, followUps) = FollowUps.Extract(completion.AssistantText ?? "");
                    if (completion.FinishReason != ModelFinishReason.Stop || string.IsNullOrWhiteSpace(finalReply))
                    {
                        logger.LogWarning("AiCoach returned an invalid response for {ConversationId}: finish reason {FinishReason}",
                            request.ConversationId, completion.FinishReason);
                        return Result(null, "invalid_response");
                    }
                    ct.ThrowIfCancellationRequested();
                    // History keeps only the visible reply, so the model never imitates an old block.
                    turn.Add(new GatewayAssistantMessage(finalReply, []));
                    return Result(finalReply, null, followUps);
                }
                if (lastCall)
                {
                    logger.LogWarning("AiCoach tool limit reached for {ConversationId} with {ToolCallCount} pending tool calls",
                        request.ConversationId, completion.ToolCalls.Count);
                    return Result(null, "tool_limit");
                }
                var toolRoundText = completion.AssistantText is null ? null : FollowUps.Extract(completion.AssistantText).Reply;
                var assistant = new GatewayAssistantMessage(toolRoundText, completion.ToolCalls);
                // Tool-round commentary is not a persisted assistant reply.
                await Emit("reply.reset", new { });
                turn.Add(assistant);
                liveTurn.Add(assistant);
                ToolExecutionResult? singleExecution = null;
                foreach (var tool in completion.ToolCalls)
                {
                    toolCalls++;
                    var execution = await executor.ExecuteAsync(tool, ct);
                    if (execution.Succeeded && !execution.Replayed && tool.Name is "add_items" or "update_items" or "remove_items")
                    {
                        var pending = workspace.Drafts.SingleOrDefault(draft => draft.IsReviewList
                            && draft.Status is ProposalSetStatus.Pending or ProposalSetStatus.Processing);
                        await Emit("review.preview", new
                        {
                            pendingList = pending is null ? null : ConversationSnapshotProjector.ToDto(pending, true),
                        });
                    }
                    if ((tool.Name == "list_tasks" && execution.Succeeded) || execution.ScheduleChecked)
                        taskContextRead = true;
                    singleExecution = execution;
                    var result = execution.Content;
                    logger.LogInformation("AiCoach tool outcome {ToolName}: success={Succeeded}, error={ErrorCode}, replayed={Replayed}",
                        tool.Name, execution.Succeeded, execution.ErrorCode, execution.Replayed);
                    logger.LogInformation("AiCoach tool {ToolName} executed for {ConversationId} (call {ToolCallCount})",
                        tool.Name, request.ConversationId, toolCalls);
                    await Trace("tool_result", new
                    {
                        toolCallNumber = toolCalls, toolCallId = tool.Id, tool.Name,
                        tool.ArgumentsJson, execution.Succeeded, execution.ErrorCode,
                        execution.Replayed, result,
                    });
                    if (environment?.IsDevelopment() == true)
                        logger.LogInformation(
                            "AiCoach tool payload for {ConversationId}: ToolCallId={ToolCallId}, Tool={ToolName}, Arguments={ToolArguments}, Result={ToolResult}",
                            request.ConversationId, tool.Id, tool.Name, tool.ArgumentsJson, result);
                    var message = new GatewayToolResultMessage(tool.Id, result);
                    liveTurn.Add(message);
                    turn.Add(tool.Name == "list_tasks" && execution.Succeeded
                        ? new GatewayToolResultMessage(tool.Id,
                            "Task schedule was read for this turn. Re-read for current task details.")
                        : message);
                }
                if (toolCalls == 1 && completion.ToolCalls.Count == 1
                    && string.IsNullOrWhiteSpace(completion.AssistantText)
                    && singleExecution is { Succeeded: true, Replayed: false, SuccessReply: { } reply })
                {
                    ct.ThrowIfCancellationRequested();
                    await Emit("reply.delta", new { text = reply });
                    turn.Add(new GatewayAssistantMessage(reply, []));
                    logger.LogInformation("AiCoach completed {ConversationId} with a prewritten draft reply after one successful tool call",
                        request.ConversationId);
                    return Result(reply, null);
                }
                logger.LogInformation(
                    "AiCoach continuing model loop for {ConversationId} after tool calls: {TurnToolCallCount} calls, lastToolSucceeded={LastToolSucceeded}, hasPrewrittenReply={HasPrewrittenReply}",
                    request.ConversationId, toolCalls, singleExecution?.Succeeded, singleExecution?.SuccessReply is not null);
            }
            return Result(null, "model_call_limit");
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("AiCoach model turn cancelled or timed out for {ConversationId}", request.ConversationId);
            return Result(null, ct.IsCancellationRequested ? "cancelled" : "timed_out");
        }
        catch (System.ClientModel.ClientResultException ex)
        {
            logger.LogWarning(ex, "AiCoach gateway request failed for {ConversationId}", request.ConversationId);
            return Result(null, ex.Status is 401 or 403 ? "configuration_error" : "model_unavailable");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "AiCoach gateway request failed for {ConversationId}", request.ConversationId);
            return Result(null, ex.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden
                ? "configuration_error" : "model_unavailable");
        }
        catch (ModelContextException ex)
        {
            return Result(null, ex.Code);
        }
        catch (ModelCallBudgetException ex)
        {
            logger.LogWarning(ex, "AiCoach turn exhausted its model budget for {ConversationId}", request.ConversationId);
            return Result(null, "model_call_limit");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach model transport failed for {ConversationId}", request.ConversationId);
            return Result(null, "model_unavailable");
        }

        async Task<ModelCompletionResult> Call(ModelGatewayRequest modelRequest)
        {
            if (calls >= limits.MaxModelCallsPerTurn) throw new ModelCallBudgetException();
            if (model is not null)
                modelRequest = modelRequest with { MaxOutputTokens = Math.Min(
                    modelRequest.MaxOutputTokens ?? model.MaxOutputTokens, model.MaxOutputTokens) };
            calls++;
            await Trace("model_request", new
            {
                modelCallNumber = calls, model = model?.Name, deploymentId = model?.DeploymentId ?? limits.DeploymentId,
                api = model?.Api ?? "ChatCompletions", model?.ReasoningEffort, modelRequest.SystemPrompt,
                messages = Elements(modelRequest.Messages), modelRequest.Tools,
                modelRequest.MaxOutputTokens,
            });
            if (environment?.IsDevelopment() == true)
            {
                var requestPayload = JsonSerializer.Serialize(new
                {
                    modelRequest.SystemPrompt,
                    messages = Elements(modelRequest.Messages),
                    tools = modelRequest.Tools,
                    modelRequest.MaxOutputTokens,
                }, ContextJson);
                logger.LogInformation("AiCoach model request {ModelCallNumber} for {ConversationId}: {ModelRequest}",
                    calls, request.ConversationId, requestPayload);
            }
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(model?.RequestTimeoutSeconds ?? limits.ModelRequestTimeoutSeconds));
            ModelCompletionResult completion;
            try
            {
                completion = await turnGateway.CompleteAsync(modelRequest, timeout.Token);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                await Trace("model_error", new { modelCallNumber = calls, errorType = ex.GetType().Name,
                    ex.Message, elapsedMs = stopwatch.ElapsedMilliseconds });
                logger.LogWarning(ex,
                    "AiCoach model call {ModelCallNumber} failed for {ConversationId} after {ElapsedMs}ms",
                    calls, request.ConversationId, stopwatch.ElapsedMilliseconds);
                throw;
            }
            stopwatch.Stop();
            input += completion.InputTokens;
            cachedInput += completion.CachedInputTokens;
            output += completion.OutputTokens;
            total += completion.TotalTokens;
            estimatedUsd += model?.EstimateUsd(completion.InputTokens, completion.CachedInputTokens, completion.OutputTokens);
            logger.LogInformation(
                "AiCoach model call {ModelCallNumber} completed for {ConversationId}: {FinishReason}, {InputTokens} input tokens ({CachedInputTokens} cached), {OutputTokens} output tokens, {ElapsedMs}ms, {ToolCallCount} tool calls",
                calls, request.ConversationId, completion.FinishReason, completion.InputTokens,
                completion.CachedInputTokens, completion.OutputTokens, stopwatch.ElapsedMilliseconds, completion.ToolCalls.Count);
            await Trace("model_response", new
            {
                modelCallNumber = calls, model = model?.Name, deploymentId = model?.DeploymentId ?? limits.DeploymentId,
                api = model?.Api ?? "ChatCompletions", completion.FinishReason, completion.AssistantText,
                completion.ToolCalls, completion.InputTokens, completion.CachedInputTokens, completion.OutputTokens,
                completion.TotalTokens, elapsedMs = stopwatch.ElapsedMilliseconds,
            });
            if (environment?.IsDevelopment() == true)
                logger.LogInformation(
                    "AiCoach model response {ModelCallNumber} for {ConversationId}: {AssistantText}; tool calls: {ToolCalls}",
                    calls, request.ConversationId, completion.AssistantText,
                    JsonSerializer.Serialize(completion.ToolCalls, ContextJson));
            return completion;
        }

        ModelTurnRunResult Result(string? text, string? error, IReadOnlyList<string>? followUps = null)
        {
            logger.LogInformation(
                "AiCoach model turn finished for {ConversationId}: {ErrorCode}, {ModelCallCount} model calls, {ToolCallCount} tool calls, {InputTokens} input tokens ({CachedInputTokens} cached), {OutputTokens} output tokens",
                request.ConversationId, error ?? "success", calls, toolCalls, input, cachedInput, output);
            if (environment?.IsDevelopment() == true)
                logger.LogInformation("AiCoach final response for {ConversationId}: {AssistantText}",
                    request.ConversationId, text);
            return new(text, error, turn, workspace.Drafts, summary, covered, input, output, total, calls,
                taskContextRead, followUps ?? [], cachedInput, model, estimatedUsd);
        }

        Task Trace(string kind, object payload) => request.Trace?.Invoke(kind, payload) ?? Task.CompletedTask;
        Task Emit(string kind, object payload) => request.Stream?.Invoke(kind, payload) ?? Task.CompletedTask;
    }

}

internal sealed class ModelCallBudgetException() : Exception("Model call budget exhausted.");
