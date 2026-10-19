using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Application.Queries;

namespace BlotzTask.Modules.AiCoach.Application.Orchestration;

public sealed class ConversationNotFoundException() : Exception("Conversation not found.");
public sealed class ConversationEndedException(Conversation conversation) : Exception("The topic has ended.")
{
    public Conversation Conversation { get; } = conversation;
}
public sealed class ConversationVersionConflictException(Conversation conversation)
    : Exception("Conversation version conflict.")
{
    public Conversation Conversation { get; } = conversation;
}

public sealed class ConversationApplication(IConversationStore store, IModelTurnRuntime runtime,
    ICheckAiQuotaService checkQuota, IRecordAiUsageService recordUsage,
    AiCoachUsageTracker usageTracker, TaskContextReader taskContextReader, DraftScheduleChecker scheduleChecker,
    TimeProvider clock, ILogger<ConversationApplication> logger, ConversationSegments segments,
    AiCoachTraceRecorder? trace = null)
{
    public async Task<ConversationSnapshotDto> SendAsync(Guid userId, Guid conversationId,
        Guid messageId, string content, int? expectedVersion, CancellationToken ct, string? timeZoneId = null,
        bool reviewListEnabled = false, Func<string, object, Task>? stream = null, string? source = null)
    {
        if (timeZoneId is not null)
        {
            try { _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId); }
            catch (Exception zoneError) when (zoneError is TimeZoneNotFoundException or InvalidTimeZoneException or ArgumentException)
            { throw new System.ComponentModel.DataAnnotations.ValidationException("A valid IANA time zone is required."); }
        }
        var prepared = await segments.PrepareSendAsync(userId, conversationId, messageId, expectedVersion, ct, timeZoneId);
        (conversationId, expectedVersion) = (prepared.ConversationId, prepared.ExpectedVersion);
        ModelTurnRequest request;
        int baseVersion;
        DateTimeOffset segmentCreatedAt;
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var conversation = await LoadOwnedAsync(store, userId, conversationId, ct);
            RequireOpen(conversation);
            if (!reviewListEnabled && conversation.Drafts.Any(draft => draft.IsReviewList
                && draft.Status is ProposalSetStatus.Pending or ProposalSetStatus.Processing))
                throw new Commands.DraftConflictException("ReviewListRequiresProtocol6", "Use a review-list capable client for the pending list.");
            var existing = conversation.Messages.FirstOrDefault(message => message.Id == messageId);
            if (existing is not null && (existing.Role != ConversationMessageRole.User || existing.Content != content))
                throw Conflict("MessageIdReused", conversation);
            if (conversation.CompletedMessages.Contains(messageId))
                return ConversationSnapshotProjector.ToDto(conversation);
            RequireIdle(conversation);
            if (expectedVersion.HasValue && conversation.Version != expectedVersion)
                throw new ConversationVersionConflictException(conversation);
            if (existing is not null && conversation.Messages.LastOrDefault()?.Id != messageId)
                throw Conflict("MessageSuperseded", conversation);
            if (timeZoneId is not null) conversation.ChangeTimeZone(timeZoneId, clock.GetUtcNow());
            conversation.BeginTurn(messageId, content, clock.GetUtcNow());
            baseVersion = conversation.Version;
            segmentCreatedAt = conversation.CreatedAt;
            var effectiveTimeZoneId = conversation.TimeZoneId;
            request = new(conversation.Id, conversation.Mode, conversation.History.ToArray(),
                conversation.Drafts.Select(draft => draft.Copy()).ToArray(), conversation.TimeZoneId,
                TimeZoneInfo.ConvertTime(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(conversation.TimeZoneId)),
                conversation.Summary, conversation.SummarizedMessageCount,
                (startDate, endDate, token) => taskContextReader.ReadAsync(userId, effectiveTimeZoneId, startDate, endDate, token),
                (items, token) => scheduleChecker.CheckAsync(userId, items, false, token),
                trace is null ? null : (kind, payload) => trace.RecordAsync(userId, conversationId, messageId, kind, payload),
                await store.FindPreviousSummaryAsync(userId, conversation.CreatedAt, ct),
                conversation.Messages.FirstOrDefault()?.CreatedAt ?? conversation.CreatedAt,
                conversation.InitialTimeZoneId ?? conversation.TimeZoneId, reviewListEnabled, stream);
            await store.SaveAsync(conversation, ct);
        }

        logger.LogInformation("AiCoach message accepted for {ConversationId} at version {ConversationVersion}",
            conversationId, baseVersion);
        if (trace is not null) await trace.RecordAsync(userId, conversationId, messageId, "user_message", new
        {
            messageId, content, conversationVersion = baseVersion, source,
            mode = request.Mode.ToString(), promptVersion = request.ReviewListEnabled ? CoachPrompt.ReviewListPromptVersion : CoachPrompt.VersionFor(request.Mode),
            toolContractVersion = ToolExecutor.ContractVersion,
        });
        ModelTurnRunResult? result = null;
        string? error = null;
        try
        {
            if (stream is not null) await stream("turn.started", new { conversationId, conversationVersion = baseVersion });
            // The new user message and running status are durable before optional summary work starts.
            if (prepared.Ended is not null)
            {
                await segments.TrySummarizeAsync(prepared.Ended, ct);
                request = request with
                {
                    PreviousClosingSummary = await store.FindPreviousSummaryAsync(userId, segmentCreatedAt, ct),
                };
            }
            await checkQuota.CheckQuotaAsync(userId, ct);
            result = await runtime.ExecuteAsync(request, ct);
            error = result.Error;
        }
        catch (AiQuotaExceededException)
        {
            logger.LogWarning("AiCoach turn rejected by quota for {ConversationId}", conversationId);
            error = "quota";
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("AiCoach turn cancelled before completion for {ConversationId}", conversationId);
            error = "cancelled";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach turn failed for {ConversationId}", conversationId);
            error = "model_unavailable";
        }

        if (result is not null)
        {
            usageTracker.Add(conversationId, result.InputTokens, result.OutputTokens, result.TotalTokens, result.ModelCallCount);
            logger.LogInformation("AiCoach usage {ConversationId}: {InputTokens} input ({CachedInputTokens} cached), {OutputTokens} output, {Calls} model calls, {Error}, prompt {PromptVersion}, tools {ToolContractVersion}",
                conversationId, result.InputTokens, result.CachedInputTokens, result.OutputTokens, result.ModelCallCount, error,
                request.ReviewListEnabled ? CoachPrompt.ReviewListPromptVersion : CoachPrompt.VersionFor(request.Mode), ToolExecutor.ContractVersion);
            try
            {
                using var accountingTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                if (result.TotalTokens > 0)
                    await recordUsage.RecordAiUsageAsync(new RecordAiUsageRequest
                    {
                        UserId = userId, InputTokens = result.InputTokens,
                        OutputTokens = result.OutputTokens, TotalTokens = result.TotalTokens,
                    }, accountingTimeout.Token);
            }
            catch (Exception ex) { logger.LogError(ex, "AiCoach usage recording failed for {ConversationId}", conversationId); }
        }

        // Complete even after client cancellation, so an abandoned HTTP request cannot leave a busy session.
        ConversationSnapshotDto snapshot;
        ConversationMessage? assistantMessage;
        TurnCommitStatus commit;
        using (await store.AcquireLockAsync(conversationId, CancellationToken.None))
        {
            var conversation = await LoadOwnedAsync(store, userId, conversationId, CancellationToken.None);
            RequireOpen(conversation);
            if (ct.IsCancellationRequested) error = "cancelled";
            commit = conversation.CompleteTurn(messageId, baseVersion, result?.Text, error,
                result?.TurnHistory ?? [], result?.Drafts ?? [], result?.Summary, result?.SummarizedMessageCount ?? 0,
                result?.TaskContextRead ?? false, clock.GetUtcNow(), result?.FollowUps);
            logger.LogInformation("AiCoach turn commit for {ConversationId}: {CommitStatus}", conversationId, commit);
            await store.SaveAsync(conversation, CancellationToken.None);
            logger.LogInformation("AiCoach conversation state saved for {ConversationId} with result {TurnResult} at version {ConversationVersion}",
                conversationId, error ?? "success", conversation.Version);
            assistantMessage = commit == TurnCommitStatus.Committed
                ? conversation.Messages.LastOrDefault(message => message.Role == ConversationMessageRole.Assistant
                    && message.TurnId == messageId)
                : null;
            snapshot = ConversationSnapshotProjector.ToDto(conversation);
        }
        if (assistantMessage is not null && trace is not null)
            await trace.RecordAsync(userId, conversationId, messageId, "assistant_message", new
            {
                assistantMessage.Id, assistantMessage.Content, assistantMessage.TaskContextRead,
                followUps = result?.FollowUps ?? [],
            }, assistantMessage.Id);
        if (trace is not null) await trace.RecordAsync(userId, conversationId, messageId, "turn_result", new
        {
            commitStatus = commit.ToString(), error, result?.InputTokens, result?.CachedInputTokens, result?.OutputTokens,
            result?.TotalTokens, result?.ModelCallCount, conversationVersion = snapshot.ConversationVersion,
        }, assistantMessage?.Id);
        return snapshot;
    }

    public static async Task<Conversation> LoadOwnedAsync(IConversationStore store, Guid userId, Guid id, CancellationToken ct)
    {
        var conversation = await store.FindAsync(id, ct);
        if (conversation is null || conversation.UserId != userId) throw new ConversationNotFoundException();
        return conversation;
    }

    public static void RequireIdle(Conversation conversation)
    {
        RequireOpen(conversation);
        if (!OperationPolicy.CanStartOperation(conversation))
            throw Conflict("ConversationBusy", conversation);
    }

    public static void RequireOpen(Conversation conversation)
    {
        if (conversation.EndedAt.HasValue) throw new ConversationEndedException(conversation);
    }

    private static Commands.DraftConflictException Conflict(string code, Conversation conversation) =>
        new(code, code, ConversationSnapshotProjector.ToDto(conversation));
}
