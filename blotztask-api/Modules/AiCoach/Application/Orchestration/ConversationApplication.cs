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
public sealed class ConversationVersionConflictException(Conversation conversation)
    : Exception("Conversation version conflict.")
{
    public Conversation Conversation { get; } = conversation;
}

public sealed class ConversationApplication(IConversationStore store, IModelTurnRuntime runtime,
    ICheckAiQuotaService checkQuota, IRecordAiUsageService recordUsage,
    AiCoachUsageTracker usageTracker, TaskContextReader taskContextReader, DraftScheduleChecker scheduleChecker,
    TimeProvider clock, ILogger<ConversationApplication> logger, AiCoachTraceRecorder? trace = null)
{
    public async Task<ConversationSnapshotDto> SendAsync(Guid userId, Guid conversationId,
        Guid messageId, string content, int? expectedVersion, CancellationToken ct)
    {
        ModelTurnRequest request;
        int baseVersion;
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var conversation = await LoadOwnedAsync(store, userId, conversationId, ct);
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
            conversation.BeginTurn(messageId, content);
            baseVersion = conversation.Version;
            var timeZoneId = conversation.TimeZoneId;
            request = new(conversation.Id, conversation.Mode, conversation.History.ToArray(),
                conversation.Drafts.Select(draft => draft.Copy()).ToArray(), conversation.TimeZoneId,
                TimeZoneInfo.ConvertTime(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(conversation.TimeZoneId)),
                conversation.Summary, conversation.SummarizedMessageCount,
                (startDate, endDate, token) => taskContextReader.ReadAsync(userId, timeZoneId, startDate, endDate, token),
                (items, token) => scheduleChecker.CheckAsync(userId, items, false, token),
                trace is null ? null : (kind, payload) => trace.RecordAsync(userId, conversationId, messageId, kind, payload));
            await store.SaveAsync(conversation, ct);
        }

        logger.LogInformation("AiCoach message accepted for {ConversationId} at version {ConversationVersion}",
            conversationId, baseVersion);
        if (trace is not null) await trace.RecordAsync(userId, conversationId, messageId, "user_message", new
        {
            messageId, content, conversationVersion = baseVersion,
            mode = request.Mode.ToString(), promptVersion = CoachPrompt.PromptVersion,
            toolContractVersion = ToolExecutor.ContractVersion,
        });
        ModelTurnRunResult? result = null;
        string? error = null;
        try
        {
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
            logger.LogInformation("AiCoach usage {ConversationId}: {InputTokens} input, {OutputTokens} output, {Calls} model calls, {Error}, prompt {PromptVersion}, tools {ToolContractVersion}",
                conversationId, result.InputTokens, result.OutputTokens, result.ModelCallCount, error,
                CoachPrompt.PromptVersion, ToolExecutor.ContractVersion);
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
            if (ct.IsCancellationRequested) error = "cancelled";
            commit = conversation.CompleteTurn(messageId, baseVersion, result?.Text, error,
                result?.TurnHistory ?? [], result?.Drafts ?? [], result?.Summary, result?.SummarizedMessageCount ?? 0,
                result?.TaskContextRead ?? false);
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
            }, assistantMessage.Id);
        if (trace is not null) await trace.RecordAsync(userId, conversationId, messageId, "turn_result", new
        {
            commitStatus = commit.ToString(), error, result?.InputTokens, result?.OutputTokens,
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
        if (!OperationPolicy.CanStartOperation(conversation))
            throw Conflict("ConversationBusy", conversation);
    }

    private static Commands.DraftConflictException Conflict(string code, Conversation conversation) =>
        new(code, code, ConversationSnapshotProjector.ToDto(conversation));
}
