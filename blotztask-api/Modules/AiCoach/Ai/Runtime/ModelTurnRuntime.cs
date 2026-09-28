using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using static BlotzTask.Modules.AiCoach.Ai.Runtime.ModelContextBuilder;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

public sealed record ModelTurnRequest(Guid ConversationId, AiCoachMode Mode, IReadOnlyList<GatewayMessage> History,
    IReadOnlyList<ProposalSet> Drafts, string TimeZoneId, DateTimeOffset LocalNow,
    string? Summary, int SummarizedMessageCount,
    Func<DateOnly, DateOnly, CancellationToken, Task<string>>? ReadTasks = null,
    Func<IReadOnlyList<TaskProposal>, CancellationToken, Task<ScheduleAssessment>>? CheckSchedule = null,
    Func<string, object, Task>? Trace = null);

public sealed record ModelTurnRunResult(string? Text, string? Error,
    IReadOnlyList<GatewayMessage> TurnHistory, IReadOnlyList<ProposalSet> Drafts,
    string? Summary, int SummarizedMessageCount,
    int InputTokens, int OutputTokens, int TotalTokens, int ModelCallCount,
    bool TaskContextRead = false);

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
        logger.LogInformation(
            "AiCoach model turn started for {ConversationId} in {Mode} mode with {HistoryMessageCount} history messages and {DraftCount} drafts",
            request.ConversationId, request.Mode, request.History.Count, request.Drafts.Count);
        var workspace = new DraftTools(request.Drafts, request.TimeZoneId);
        var executor = new ToolExecutor(workspace, limits, request.ReadTasks, request.CheckSchedule);
        var turn = new List<GatewayMessage>();
        var summary = request.Summary;
        var covered = request.SummarizedMessageCount;
        var calls = 0;
        var toolCalls = 0;
        var input = 0;
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
                if (!contextBuilder.FitsBudget(system, transcript, executor.AvailableTools))
                {
                    logger.LogWarning("AiCoach context limit reached for {ConversationId} before model call {ModelCallNumber}",
                        request.ConversationId, calls + 1);
                    return Result(null, "context_limit");
                }
                var lastCall = calls == limits.MaxModelCallsPerTurn - 1 || executor.BudgetExhausted;
                var completion = await Call(new ModelGatewayRequest(system, transcript,
                    lastCall ? [] : executor.AvailableTools, MaxOutputTokens: limits.MaxOutputTokens));
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
                    if (completion.FinishReason != ModelFinishReason.Stop || string.IsNullOrWhiteSpace(completion.AssistantText))
                    {
                        logger.LogWarning("AiCoach returned an invalid response for {ConversationId}: finish reason {FinishReason}",
                            request.ConversationId, completion.FinishReason);
                        return Result(null, "invalid_response");
                    }
                    ct.ThrowIfCancellationRequested();
                    turn.Add(new GatewayAssistantMessage(completion.AssistantText, []));
                    return Result(completion.AssistantText, null);
                }
                if (lastCall)
                {
                    logger.LogWarning("AiCoach tool limit reached for {ConversationId} with {ToolCallCount} pending tool calls",
                        request.ConversationId, completion.ToolCalls.Count);
                    return Result(null, "tool_limit");
                }
                var assistant = new GatewayAssistantMessage(completion.AssistantText, completion.ToolCalls);
                transcript.Add(assistant);
                turn.Add(assistant);
                ToolExecutionResult? singleExecution = null;
                foreach (var tool in completion.ToolCalls)
                {
                    toolCalls++;
                    var execution = await executor.ExecuteAsync(tool, ct);
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
                    transcript.Add(message);
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
            calls++;
            await Trace("model_request", new
            {
                modelCallNumber = calls, limits.DeploymentId, modelRequest.SystemPrompt,
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
            timeout.CancelAfter(TimeSpan.FromSeconds(limits.ModelRequestTimeoutSeconds));
            ModelCompletionResult completion;
            try
            {
                completion = await gateway.CompleteAsync(modelRequest, timeout.Token);
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
            output += completion.OutputTokens;
            total += completion.TotalTokens;
            logger.LogInformation(
                "AiCoach model call {ModelCallNumber} completed for {ConversationId}: {FinishReason}, {InputTokens} input tokens, {OutputTokens} output tokens, {ElapsedMs}ms, {ToolCallCount} tool calls",
                calls, request.ConversationId, completion.FinishReason, completion.InputTokens,
                completion.OutputTokens, stopwatch.ElapsedMilliseconds, completion.ToolCalls.Count);
            await Trace("model_response", new
            {
                modelCallNumber = calls, completion.FinishReason, completion.AssistantText,
                completion.ToolCalls, completion.InputTokens, completion.OutputTokens,
                completion.TotalTokens, elapsedMs = stopwatch.ElapsedMilliseconds,
            });
            if (environment?.IsDevelopment() == true)
                logger.LogInformation(
                    "AiCoach model response {ModelCallNumber} for {ConversationId}: {AssistantText}; tool calls: {ToolCalls}",
                    calls, request.ConversationId, completion.AssistantText,
                    JsonSerializer.Serialize(completion.ToolCalls, ContextJson));
            return completion;
        }

        ModelTurnRunResult Result(string? text, string? error)
        {
            logger.LogInformation(
                "AiCoach model turn finished for {ConversationId}: {ErrorCode}, {ModelCallCount} model calls, {ToolCallCount} tool calls, {InputTokens} input tokens, {OutputTokens} output tokens",
                request.ConversationId, error ?? "success", calls, toolCalls, input, output);
            if (environment?.IsDevelopment() == true)
                logger.LogInformation("AiCoach final response for {ConversationId}: {AssistantText}",
                    request.ConversationId, text);
            return new(text, error, turn, workspace.Drafts, summary, covered, input, output, total, calls,
                taskContextRead);
        }

        Task Trace(string kind, object payload) => request.Trace?.Invoke(kind, payload) ?? Task.CompletedTask;
    }

}

internal sealed class ModelCallBudgetException() : Exception("Model call budget exhausted.");
