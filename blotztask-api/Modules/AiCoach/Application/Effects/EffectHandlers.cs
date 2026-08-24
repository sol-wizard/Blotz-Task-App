using System.ClientModel;
using BlotzTask.Modules.AiCoach.Ai.ModelTurn;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using Microsoft.Extensions.Options;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.AiCoach.Application.Effects;

/// <summary>
/// Everything an effect needs, captured under the conversation lock at dispatch time so the
/// effect itself runs on a consistent view without holding the lock.
/// </summary>
public sealed record EffectExecutionContext(
    Guid ConversationId,
    Guid UserId,
    Guid EffectId,
    int BaseConversationVersion,
    ConversationEffectRequest Request,
    ConversationSnapshot Snapshot,
    IReadOnlyList<ConversationMessage> RecentMessages,
    string TimeZoneId,
    AiCoachModeDefinition ModeDefinition);

public interface IConversationEffectHandler
{
    bool CanHandle(ConversationEffectRequest request);

    /// <summary>Executes the effect and converts the outcome into a result event (or null to drop).</summary>
    Task<ConversationEvent?> ExecuteAsync(EffectExecutionContext context, CancellationToken ct);
}

/// <summary>
/// Runs one model turn: quota check, bounded tool loop, usage recording, and mapping of every
/// outcome onto a stable result event. All model calls share the existing monthly AI quota
/// (requirements §15).
/// </summary>
public sealed class GenerateModelTurnEffectHandler(
    IModelTurnExecutor executor,
    ICheckAiQuotaService checkQuota,
    IRecordAiUsageService recordUsage,
    AiCoachUsageTracker usageTracker,
    IOptions<AiCoachModuleOptions> options,
    TimeProvider clock,
    ILogger<GenerateModelTurnEffectHandler> logger) : IConversationEffectHandler
{
    public bool CanHandle(ConversationEffectRequest request) => request is GenerateModelTurnEffectRequest;

    public async Task<ConversationEvent?> ExecuteAsync(EffectExecutionContext context, CancellationToken ct)
    {
        try
        {
            await checkQuota.CheckQuotaAsync(context.UserId, ct);
        }
        catch (AiQuotaExceededException)
        {
            return new ModelGenerationFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.QuotaExceeded);
        }

        ModelTurnResult result;
        try
        {
            var timeZone = ResolveTimeZone(context.TimeZoneId);
            var userLocalNow = TimeZoneInfo.ConvertTime(clock.GetUtcNow(), timeZone);

            result = await executor.ExecuteAsync(
                new ModelTurnRequest(
                    context.Snapshot,
                    context.EffectId,
                    context.ModeDefinition,
                    context.RecentMessages,
                    context.TimeZoneId,
                    userLocalNow),
                ct);
        }
        catch (ClientResultException ex)
        {
            logger.LogError(ex, "Azure OpenAI call failed with status {Status}", ex.Status);
            var code = ex.Status switch
            {
                429 or >= 500 => AiGenerationErrorCode.ModelUnavailable,
                401 or 403 => AiGenerationErrorCode.ConfigurationError,
                _ => AiGenerationErrorCode.Unknown,
            };
            return new ModelGenerationFailed(context.EffectId, context.BaseConversationVersion, code);
        }

        if (result.TotalTokens > 0)
        {
            await recordUsage.RecordAiUsageAsync(new RecordAiUsageRequest
            {
                UserId = context.UserId,
                InputTokens = result.InputTokens,
                OutputTokens = result.OutputTokens,
                TotalTokens = result.TotalTokens,
            }, ct);

            // Session cost visibility (§27): one line per turn with the running conversation
            // total, so watching the console while using the app shows what the session costs.
            var usage = usageTracker.Add(
                context.ConversationId, result.InputTokens, result.OutputTokens, modelCalls: 1);
            var opts = options.Value;
            var cost = usage.EstimateUsd(opts.InputTokenUsdPerMillion, opts.OutputTokenUsdPerMillion);
            logger.LogInformation(
                "AiCoach usage: conversation {ConversationId} turn={Turn} turnTokens={TurnTokens} (in={InputTokens}/out={OutputTokens}) | conversation total={TotalTokens} (in={TotalInput}/out={TotalOutput}){Cost}",
                context.ConversationId, usage.Turns, result.TotalTokens, result.InputTokens, result.OutputTokens,
                usage.TotalTokens, usage.InputTokens, usage.OutputTokens,
                cost is null ? " | cost: set AiCoach:InputTokenUsdPerMillion + OutputTokenUsdPerMillion to see $" : $" | est ${cost:F4}");
        }

        return result.CompletionReason switch
        {
            ModelTurnCompletionReason.Completed => new ModelTurnCompleted(
                context.EffectId,
                context.BaseConversationVersion,
                result.AssistantMessage!,
                result.ProposedDraft),
            ModelTurnCompletionReason.ContentFiltered => new ModelGenerationFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.ContentFiltered),
            ModelTurnCompletionReason.TimedOut => new ModelGenerationFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.TimedOut),
            ModelTurnCompletionReason.Cancelled => new ModelGenerationFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.Cancelled),
            ModelTurnCompletionReason.ModelUnavailable => new ModelGenerationFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.ModelUnavailable),
            _ => new ModelGenerationFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.InvalidModelResponse),
        };
    }

    private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}

/// <summary>
/// Persists a confirmed draft card as formal tasks through the EXISTING task command handler
/// (tech design §22 / brief step 7), one task per item, in card order. Items already saved by
/// an earlier attempt are not on <see cref="ValidatedTaskDraft.Items"/> and are never recreated.
/// Note on transaction boundaries (§22.10): AddTaskCommandHandler commits its own SaveChanges;
/// since v1 conversations are in-memory (no shared DB transaction is possible anyway),
/// consistency is maintained by the effect result events — the items created before a failure
/// are reported on the failure event so the draft records them, and a lost response is
/// replayed via the command receipt.
/// </summary>
public sealed class PersistDraftEffectHandler(
    AddTaskCommandHandler addTaskCommandHandler,
    ILogger<PersistDraftEffectHandler> logger) : IConversationEffectHandler
{
    public bool CanHandle(ConversationEffectRequest request) => request is PersistDraftEffectRequest;

    public async Task<ConversationEvent?> ExecuteAsync(EffectExecutionContext context, CancellationToken ct)
    {
        var request = (PersistDraftEffectRequest)context.Request;
        var draft = request.ValidatedDraft;
        var itemsById = draft.Payload.Items.ToDictionary(i => i.ItemId);

        var persisted = new List<PersistedDraftItem>(draft.Items.Count);
        foreach (var resolved in draft.Items)
        {
            var item = itemsById[resolved.ItemId];
            try
            {
                var taskId = await addTaskCommandHandler.Handle(new AddTaskCommand
                {
                    UserId = context.UserId,
                    TaskDetails = new AddTaskItemDto
                    {
                        Title = item.Title,
                        Description = item.Description ?? string.Empty,
                        StartTime = resolved.StartUtc,
                        EndTime = resolved.EndUtc,
                        TimeType = TaskTimeType.RangeTime,
                        LabelId = item.LabelId,
                    },
                }, ct);

                persisted.Add(new PersistedDraftItem(item.ItemId, taskId));
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Failed to persist draft {ArtifactId} item {ItemId} ({Done}/{Total} created) for conversation {ConversationId}",
                    request.ArtifactId, item.ItemId, persisted.Count, draft.Items.Count, context.ConversationId);
                return new DraftPersistenceFailed(
                    context.EffectId, request.ArtifactId, "TaskPersistenceFailed", persisted);
            }
        }

        // Items saved on an earlier attempt count toward the final result too.
        var alreadyPersisted = draft.Payload.Items
            .Where(i => i.PersistedTaskId.HasValue)
            .Select(i => new PersistedDraftItem(i.ItemId, i.PersistedTaskId!.Value));

        return new DraftPersistenceSucceeded(
            context.EffectId,
            request.ArtifactId,
            alreadyPersisted.Concat(persisted).ToList(),
            request.Action,
            draft.FocusMinutes);
    }
}
