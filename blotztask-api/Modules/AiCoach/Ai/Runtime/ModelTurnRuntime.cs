using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using static BlotzTask.Modules.AiCoach.Ai.Runtime.ModelContextBuilder;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiUsage.Exceptions;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

public sealed record ModelTurnRequest(Guid ConversationId, IReadOnlyList<GatewayMessage> History,
    IReadOnlyList<ProposalSet> Drafts, string TimeZoneId, DateTimeOffset LocalNow,
    string? Summary, int SummarizedMessageCount,
    Func<DateOnly, DateOnly, CancellationToken, Task<string>>? ReadTasks = null,
    Func<IReadOnlyList<TaskProposal>, CancellationToken, Task<ScheduleAssessment>>? CheckSchedule = null,
    Func<string, object, Task>? Trace = null, string? PreviousClosingSummary = null,
    DateTimeOffset? SegmentStartedAt = null, string? SegmentStartTimeZoneId = null,
    bool ReviewListEnabled = false,
    Func<string, object, Task>? Stream = null, string? UserContext = null, MemoryTools? MemoryTools = null,
    // Every model call in the turn, compression included, is charged to this user's allowance.
    Guid? UserId = null,
    // Saved tasks for today and the next six days, read once at the start of the turn; set by the runtime.
    string? UpcomingSchedule = null,
    // The topic's latest replies: unsaved items suggested before them are shown briefly in the draft context.
    IReadOnlySet<Guid>? RecentReplyIds = null,
    // Model profile the client asked for; honoured only where AiCoach:AllowModelOverride is on.
    string? Model = null,
    // Saved review items whose task or note was deleted in the app since; listed apart in the drafts context.
    IReadOnlySet<Guid>? DeletedSavedItemIds = null);

public sealed record ModelTurnRunResult(string? Text, string? Error,
    IReadOnlyList<GatewayMessage> TurnHistory, IReadOnlyList<ProposalSet> Drafts,
    string? Summary, int SummarizedMessageCount,
    int InputTokens, int OutputTokens, int TotalTokens, int ModelCallCount,
    bool TaskContextRead = false, IReadOnlyList<string>? FollowUps = null, int CachedInputTokens = 0,
    AiCoachModelProfile? Model = null, decimal? EstimatedUsd = null, IReadOnlyList<string>? ToolNames = null);

public interface IModelTurnRuntime
{
    Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken ct);
}

public sealed class ModelTurnRuntime(IModelGateway gateway, IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnRuntime> logger, ModelContextBuilder contextBuilder,
    IHostEnvironment? environment = null) : IModelTurnRuntime
{
    // Plain words on purpose: the coach should simply do less per step, not talk about limits or tokens.
    private static readonly GatewaySystemMessage OutputCutOffNote = new(
        "Your last answer was too long to finish, so none of it reached the user or the list. Try again in smaller " +
        "steps: add at most 10 items per add_items call and call it again for the rest, plan briefly, and keep your " +
        "message to the user short and friendly. Don't mention that anything was cut off; just help as usual.");
    private static readonly GatewaySystemMessage CloseAfterCutOffNote = new(
        "You can't add or change items any more in this reply. In two or three short, friendly sentences, tell the " +
        "user what is now in their list waiting for confirmation (the current drafts above), what is still missing, " +
        "and that they can just say \"continue\" to have you add the rest. Don't mention limits or anything technical.");

    // Matches the longest list_tasks range, so "this week" and "next Monday" need no read of their own.
    private const int UpcomingScheduleDays = 7;

    // A provider asking for a longer wait is better answered by an error the user can retry than a silent stall.
    private static readonly TimeSpan MaxRetryWait = TimeSpan.FromSeconds(20);

    /// <summary>How long to wait before the one retry, or null when the provider asked for longer than is worth it.</summary>
    private static TimeSpan? RetryWait(Exception ex)
    {
        if (ex.Data[AzureResponsesModelGateway.RetryAfterKey] is TimeSpan asked)
            return asked > MaxRetryWait ? null : asked < TimeSpan.FromSeconds(1) ? TimeSpan.FromSeconds(1) : asked;
        // A rate limit with no hint: a few seconds lets part of the per-minute window pass.
        var rateLimited = ex is HttpRequestException { StatusCode: System.Net.HttpStatusCode.TooManyRequests }
            or System.ClientModel.ClientResultException { Status: 429 };
        return TimeSpan.FromSeconds(rateLimited ? 10 : 1);
    }

    /// <summary>Failures worth one more try: timeouts of a single call, dropped streams, 408, 429 and 5xx.</summary>
    private static bool IsTransient(Exception ex, CancellationToken ct) => ex switch
    {
        // Only this call's own timeout; the user leaving cancels the turn instead.
        OperationCanceledException => !ct.IsCancellationRequested,
        HttpRequestException http => (int?)http.StatusCode is null or 408 or 429 or >= 500,
        System.ClientModel.ClientResultException client => client.Status is 0 or 408 or 429 or >= 500,
        IOException => true,
        _ => false,
    };

    public async Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken ct)
    {
        var limits = options.Value;
        var turnGateway = request.UserId is { } userId ? gateway.OpenTurn(userId, request.Model) : gateway.OpenTurn();
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
        var toolNames = new List<string>();
        var input = 0;
        var cachedInput = 0;
        var output = 0;
        var total = 0;
        var taskContextRead = false;
        // When text first reaches the user, per streamed segment (a reset starts a new one): the wait a user feels.
        var turnStarted = System.Diagnostics.Stopwatch.GetTimestamp();
        var segmentHasText = false;
        try
        {
            request = request with { UpcomingSchedule = await ReadUpcomingScheduleAsync() };
            var context = await contextBuilder.BuildAsync(request, executor.AvailableTools, Call);
            var system = context.SystemPrompt;
            var transcript = context.Transcript;
            summary = context.Summary;
            covered = context.SummarizedMessageCount;
            // Set once a reply is cut off; the note then stays for the rest of the turn so later calls also stay short.
            var outputCutOff = false;
            // Set when a reply is cut off again after this turn already changed the list: one short closing reply
            // without tools keeps that work instead of failing the whole turn.
            var closeWithoutTools = false;
            // Set once this turn's projection no longer fits; see BuildTurnTranscript.
            var compactTurn = false;

            while (calls < limits.MaxModelCallsPerTurn)
            {
                // Tool execution mutates only the workspace. Rebuild the model projection with one
                // current draft snapshot while leaving raw turn results intact for commit and traces.
                transcript = contextBuilder.BuildTurnTranscript(context, liveTurn, workspace.Drafts, compactTurn);
                var contextFull = false;
                if (!compactTurn && liveTurn.Count > 0 && !contextBuilder.FitsBudget(system, transcript, executor.AvailableTools))
                {
                    // Dropping results later ones replaced is cheaper than summarizing history. It stays on for the rest
                    // of the turn so the prompt prefix stops changing.
                    compactTurn = true;
                    transcript = contextBuilder.BuildTurnTranscript(context, liveTurn, workspace.Drafts, compactTurn);
                    logger.LogInformation("AiCoach compacted superseded tool results for {ConversationId} before model call {ModelCallNumber}",
                        request.ConversationId, calls + 1);
                }
                if (liveTurn.Count > 0 && !contextBuilder.FitsBudget(system, transcript, executor.AvailableTools))
                {
                    var projectedTurn = contextBuilder.BuildTurnTranscript(context with { Transcript = [] },
                        liveTurn, workspace.Drafts, compactTurn).Take(liveTurn.Count);
                    var turnBytes = Size(projectedTurn);
                    try
                    {
                        context = await contextBuilder.BuildAsync(request with
                        {
                            Drafts = workspace.Drafts, Summary = summary, SummarizedMessageCount = covered,
                        }, executor.AvailableTools, Call, turnBytes);
                        system = context.SystemPrompt;
                        summary = context.Summary;
                        covered = context.SummarizedMessageCount;
                        transcript = contextBuilder.BuildTurnTranscript(context, liveTurn, workspace.Drafts, compactTurn);
                    }
                    catch (ModelContextException ex) when (ex.Code == "context_limit")
                    {
                        // This turn's tool results alone no longer fit; the previous context is still usable.
                        contextFull = true;
                    }
                }
                if (contextFull || !contextBuilder.FitsBudget(system, transcript, executor.AvailableTools))
                {
                    // Work already done this turn lives in the drafts, so the coach can still say what it did.
                    var wrapUp = liveTurn.Count == 0 ? null : WrapUpTranscript(context);
                    if (wrapUp is null || !contextBuilder.FitsBudget(system, wrapUp, []))
                    {
                        logger.LogWarning("AiCoach context limit reached for {ConversationId} before model call {ModelCallNumber}",
                            request.ConversationId, calls + 1);
                        return Result(null, "context_limit");
                    }
                    logger.LogWarning("AiCoach context full for {ConversationId} after {ToolCallCount} tool calls; asking for a closing reply without tools",
                        request.ConversationId, toolCalls);
                    transcript = wrapUp;
                    contextFull = true;
                }
                var lastCall = contextFull || closeWithoutTools || calls == limits.MaxModelCallsPerTurn - 1
                    || executor.BudgetExhausted;
                await Emit("reply.reset", new { });
                var filter = request.Stream is null ? null : new FollowUpStreamFilter(text => Emit("reply.delta", new { text }));
                var completion = await Call(new ModelGatewayRequest(system,
                    closeWithoutTools ? [.. transcript, CloseAfterCutOffNote]
                        : outputCutOff ? [.. transcript, OutputCutOffNote] : transcript,
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
                    // A cut-off reply is dropped whole: its tool calls never ran and its text is reset on the next call.
                    if (!outputCutOff && calls < limits.MaxModelCallsPerTurn)
                    {
                        logger.LogWarning("AiCoach output cut off for {ConversationId} at model call {ModelCallNumber}; retrying once in smaller steps",
                            request.ConversationId, calls);
                        outputCutOff = true;
                        continue;
                    }
                    if (!closeWithoutTools && liveTurn.Count > 0 && calls < limits.MaxModelCallsPerTurn)
                    {
                        logger.LogWarning("AiCoach output cut off again for {ConversationId}; closing with a reply without tools",
                            request.ConversationId);
                        closeWithoutTools = true;
                        continue;
                    }
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
                    toolNames.Add(tool.Name);
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
                // Schedule reads before this call only informed the reply the model has just written, so they
                // do not need another model call (about a third of the turn's tokens) to restate it.
                if (completion.ToolCalls.Count == 1
                    && toolNames.Take(toolNames.Count - 1).All(name => name == "list_tasks")
                    && string.IsNullOrWhiteSpace(completion.AssistantText)
                    && singleExecution is { Succeeded: true, Replayed: false, SuccessReply: { } reply })
                {
                    ct.ThrowIfCancellationRequested();
                    // A conflict reply carries its own follow-ups (move it / keep it).
                    var (text, followUps) = FollowUps.Extract(reply);
                    await Emit("reply.delta", new { text });
                    turn.Add(new GatewayAssistantMessage(text, []));
                    logger.LogInformation("AiCoach completed {ConversationId} with a prewritten draft reply after {ToolCallCount} tool calls",
                        request.ConversationId, toolCalls);
                    return Result(text, null, followUps);
                }
                logger.LogInformation(
                    "AiCoach continuing model loop for {ConversationId} after tool calls: {TurnToolCallCount} calls, lastToolSucceeded={LastToolSucceeded}, hasPrewrittenReply={HasPrewrittenReply}",
                    request.ConversationId, toolCalls, singleExecution?.Succeeded, singleExecution?.SuccessReply is not null);
            }
            return Result(null, "model_call_limit");
        }
        catch (AiQuotaExceededException)
        {
            logger.LogWarning("AiCoach budget exhausted for {ConversationId}", request.ConversationId);
            return Result(null, "quota");
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
            // A provider hiccup (stream error, 429/5xx, a call that hangs past its timeout) otherwise throws away
            // every call the turn already made. One retry counts as a model call, so the turn's time bound holds.
            for (var attempt = 1; ; attempt++)
            {
                var streamed = false;
                var attemptRequest = modelRequest.OnTextDelta is { } onText
                    ? modelRequest with { OnTextDelta = text => { streamed = true; return onText(text); } }
                    : modelRequest;
                try
                {
                    return await CallOnce(attemptRequest);
                }
                // Text already shown to the user cannot be taken back, so a retry would repeat it.
                catch (Exception ex) when (attempt == 1 && !streamed && calls < limits.MaxModelCallsPerTurn
                                           && IsTransient(ex, ct) && RetryWait(ex) is { } wait)
                {
                    logger.LogWarning("AiCoach retrying model call {ModelCallNumber} for {ConversationId} in {WaitSeconds}s after {ErrorType}",
                        calls, request.ConversationId, wait.TotalSeconds, ex.GetType().Name);
                    await Trace("model_retry", new { modelCallNumber = calls, errorType = ex.GetType().Name, waitMs = (int)wait.TotalMilliseconds });
                    await Task.Delay(wait, ct);
                    // The loop keeps the turn's last call free of tools so it always ends with a reply. A retry that
                    // lands on that call must be that reply too, or the turn fails with model_call_limit and loses its drafts.
                    if (calls == limits.MaxModelCallsPerTurn - 1 && modelRequest.Tools.Count > 0)
                        modelRequest = modelRequest with { Tools = [] };
                }
            }
        }

        async Task<ModelCompletionResult> CallOnce(ModelGatewayRequest modelRequest)
        {
            calls++;
            // Definitions are saved once per distinct list; the request trace keeps only the hash and names.
            var toolSet = TraceToolSet.From(modelRequest.Tools);
            if (toolSet is not null) await Trace(TraceToolSet.Kind, toolSet);
            await Trace("model_request", new
            {
                modelCallNumber = calls, model = model?.Name, deploymentId = model?.DeploymentId ?? limits.DeploymentId,
                api = model?.Api ?? "ChatCompletions", model?.ReasoningEffort, modelRequest.SystemPrompt,
                messages = Elements(modelRequest.Messages), toolSetHash = toolSet?.Hash,
                toolNames = modelRequest.Tools.Select(tool => tool.Name).ToArray(),
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
            var firstOutput = TimeSpan.FromSeconds(model?.RequestTimeoutSeconds ?? limits.ModelRequestTimeoutSeconds);
            var callLimit = TimeSpan.FromSeconds(Math.Max(limits.ModelCallMaxSeconds, firstOutput.TotalSeconds));
            var idle = TimeSpan.FromSeconds(limits.StreamIdleTimeoutSeconds);
            timeout.CancelAfter(firstOutput);
            // The first-output limit alone cut off a long plan the model was still writing. Each streamed piece
            // now restarts a short idle clock instead, never past the call's overall limit.
            void OnProgress()
            {
                var left = callLimit - stopwatch.Elapsed;
                if (left > TimeSpan.Zero) timeout.CancelAfter(left < idle ? left : idle);
            }
            ModelCompletionResult completion;
            try
            {
                completion = await turnGateway.CompleteAsync(modelRequest with { OnOutputProgress = OnProgress }, timeout.Token);
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

        // The turn's tool calls and results are left out (they no longer fit); the current drafts at the tail
        // carry their effect.
        List<GatewayMessage> WrapUpTranscript(ModelContext current)
        {
            var wrapUp = contextBuilder.BuildTurnTranscript(current, [], workspace.Drafts);
            wrapUp.Add(new GatewaySystemMessage(
                "This turn already used these tools: " + string.Join(", ", toolNames.Distinct()) + ". " +
                "Their results are left out because the conversation is too long to show them, and tools are no longer " +
                "available in this turn. The current drafts above already include their effect. Reply to the user now: " +
                "say briefly what was done, and if the request is not finished, say what is left and suggest continuing " +
                "in a smaller step (for example one week or one part at a time) in their next message. You can read " +
                "their tasks again next turn, so never ask them to send task data. Do not claim anything was done that " +
                "the drafts do not show."));
            return wrapUp;
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
                taskContextRead, followUps ?? [], cachedInput, model, estimatedUsd, toolNames);
        }

        Task Trace(string kind, object payload) => request.Trace?.Invoke(kind, payload) ?? Task.CompletedTask;

        // Seven of ten turns used to open with a list_tasks call (1-3 s plus a model round trip) before the coach
        // could say anything; reading the coming week up front lets the first call answer. A failed read is not
        // fatal: list_tasks is still offered.
        async Task<string?> ReadUpcomingScheduleAsync()
        {
            if (request.ReadTasks is null) return request.UpcomingSchedule;
            var today = DateOnly.FromDateTime(request.LocalNow.DateTime);
            var endDate = today.AddDays(UpcomingScheduleDays - 1);
            var started = System.Diagnostics.Stopwatch.GetTimestamp();
            try
            {
                var schedule = await request.ReadTasks(today, endDate, ct);
                await Trace("schedule_preloaded", new
                {
                    startDate = today.ToString("yyyy-MM-dd"), endDate = endDate.ToString("yyyy-MM-dd"),
                    bytes = System.Text.Encoding.UTF8.GetByteCount(schedule),
                    elapsedMs = (int)System.Diagnostics.Stopwatch.GetElapsedTime(started).TotalMilliseconds,
                });
                return schedule;
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogWarning(ex, "AiCoach could not preload the schedule for {ConversationId}; list_tasks remains available",
                    request.ConversationId);
                return null;
            }
        }
        async Task Emit(string kind, object payload)
        {
            if (kind == "reply.reset") segmentHasText = false;
            else if (kind == "reply.delta" && !segmentHasText)
            {
                segmentHasText = true;
                await Trace("reply_text_started", new
                {
                    modelCallNumber = calls,
                    elapsedMs = (int)System.Diagnostics.Stopwatch.GetElapsedTime(turnStarted).TotalMilliseconds,
                });
            }
            if (request.Stream is not null) await request.Stream(kind, payload);
        }
    }

}

internal sealed class ModelCallBudgetException() : Exception("Model call budget exhausted.");
