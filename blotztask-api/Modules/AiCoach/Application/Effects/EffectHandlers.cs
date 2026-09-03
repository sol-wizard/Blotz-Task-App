using System.ClientModel;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Enums;
using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;

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
/// Runs one model turn: quota check, the single-turn runtime (policy + guards inside), usage
/// recording, and mapping of every outcome onto a stable result event. All model calls share
/// the existing monthly AI quota.
/// </summary>
public sealed class GenerateModelTurnEffectHandler(
    IModelTurnRuntime runtime,
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
        var effectStarted = Stopwatch.GetTimestamp();
        logger.LogInformation(
            "AiCoach.ModelEffect.Started ConversationId={ConversationId} EffectId={EffectId} BaseConversationVersion={BaseConversationVersion} Mode={Mode} RuleVersion={RuleVersion} PolicyVersion={PolicyVersion} PromptVersion={PromptVersion}",
            context.ConversationId,
            context.EffectId,
            context.BaseConversationVersion,
            context.ModeDefinition.Mode,
            context.ModeDefinition.RuleVersion,
            context.ModeDefinition.Policy.Version,
            context.ModeDefinition.PromptVersion);
        try
        {
            await checkQuota.CheckQuotaAsync(context.UserId, ct);
        }
        catch (AiQuotaExceededException ex)
        {
            logger.LogWarning(
                ex,
                "AiCoach.ModelEffect.QuotaRejected ConversationId={ConversationId} EffectId={EffectId} Result={Result} ElapsedMs={ElapsedMs} ExceptionMessage={ExceptionMessage}",
                context.ConversationId,
                context.EffectId,
                AiGenerationErrorCode.QuotaExceeded,
                Stopwatch.GetElapsedTime(effectStarted).TotalMilliseconds,
                ex.Message);
            return new ModelTurnFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.QuotaExceeded);
        }

        ModelTurnRunResult result;
        try
        {
            var timeZone = ResolveTimeZone(context.TimeZoneId);
            var userLocalNow = TimeZoneInfo.ConvertTime(clock.GetUtcNow(), timeZone);

            result = await runtime.ExecuteAsync(
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
            var code = ex.Status switch
            {
                429 or >= 500 => AiGenerationErrorCode.ModelUnavailable,
                401 or 403 => AiGenerationErrorCode.ConfigurationError,
                _ => AiGenerationErrorCode.Unknown,
            };
            logger.LogError(
                ex,
                "AiCoach.ModelEffect.GatewayFailed ConversationId={ConversationId} EffectId={EffectId} Status={Status} Result={Result} ElapsedMs={ElapsedMs} ExceptionMessage={ExceptionMessage}",
                context.ConversationId,
                context.EffectId,
                ex.Status,
                code,
                Stopwatch.GetElapsedTime(effectStarted).TotalMilliseconds,
                ex.Message);
            return new ModelTurnFailed(context.EffectId, context.BaseConversationVersion, code);
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

            // Session cost visibility: one line per turn with the running conversation total,
            // so watching the console while using the app shows what the session costs.
            var usage = usageTracker.Add(
                context.ConversationId, result.InputTokens, result.OutputTokens, modelCalls: 1);
            var moduleOptions = options.Value;
            var estimatedCostUsd = usage.EstimateUsd(
                moduleOptions.InputTokenUsdPerMillion,
                moduleOptions.OutputTokenUsdPerMillion);
            logger.LogInformation(
                "AiCoach.Usage.Recorded ConversationId={ConversationId} Turn={Turn} TurnTokens={TurnTokens} InputTokens={InputTokens} OutputTokens={OutputTokens} ConversationTotalTokens={ConversationTotalTokens} ConversationInputTokens={ConversationInputTokens} ConversationOutputTokens={ConversationOutputTokens} EstimatedCostUsd={EstimatedCostUsd}",
                context.ConversationId, usage.Turns, result.TotalTokens, result.InputTokens, result.OutputTokens,
                usage.TotalTokens, usage.InputTokens, usage.OutputTokens, estimatedCostUsd);
        }

        logger.LogInformation(
            "AiCoach.ModelEffect.Completed ConversationId={ConversationId} EffectId={EffectId} CompletionReason={CompletionReason} HasOutcome={HasOutcome} InputTokens={InputTokens} OutputTokens={OutputTokens} TotalTokens={TotalTokens} ElapsedMs={ElapsedMs} Outcome={Outcome}",
            context.ConversationId,
            context.EffectId,
            result.CompletionReason,
            result.Outcome is not null,
            result.InputTokens,
            result.OutputTokens,
            result.TotalTokens,
            Stopwatch.GetElapsedTime(effectStarted).TotalMilliseconds,
            JsonSerializer.Serialize(result.Outcome));

        return result.CompletionReason switch
        {
            ModelTurnCompletionReason.Completed => new ModelTurnCompleted(
                context.EffectId,
                context.BaseConversationVersion,
                result.Outcome!),
            ModelTurnCompletionReason.ContentFiltered => new ModelTurnFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.ContentFiltered),
            ModelTurnCompletionReason.TimedOut => new ModelTurnFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.TimedOut),
            ModelTurnCompletionReason.Cancelled => new ModelTurnFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.Cancelled),
            ModelTurnCompletionReason.ModelUnavailable => new ModelTurnFailed(
                context.EffectId, context.BaseConversationVersion, AiGenerationErrorCode.ModelUnavailable),
            _ => new ModelTurnFailed(
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
/// Persists a confirmed proposal set as formal tasks through the EXISTING task command handler
/// (Level-4 side effect, deterministic code only — v3 §18), one task per proposal, in card
/// order. Proposals already saved by an earlier attempt are not on
/// <see cref="ValidatedProposalSet.ToPersist"/> and are never recreated.
/// Note on transaction boundaries: AddTaskCommandHandler commits its own SaveChanges; since v1
/// conversations are in-memory (no shared DB transaction is possible anyway), consistency is
/// maintained by the effect result events — proposals created before a failure are reported on
/// the failure event so the set records them, and a lost response is replayed via the command
/// receipt.
/// </summary>
public sealed class PersistProposalSetEffectHandler(
    AddTaskCommandHandler addTaskCommandHandler,
    ILogger<PersistProposalSetEffectHandler> logger) : IConversationEffectHandler
{
    public bool CanHandle(ConversationEffectRequest request) => request is PersistProposalSetEffectRequest;

    public async Task<ConversationEvent?> ExecuteAsync(EffectExecutionContext context, CancellationToken ct)
    {
        var effectStarted = Stopwatch.GetTimestamp();
        var request = (PersistProposalSetEffectRequest)context.Request;
        var validated = request.Validated;
        var proposalsById = validated.Proposals.ToDictionary(p => p.ProposalId);

        logger.LogInformation(
            "AiCoach.ProposalPersistence.Started ConversationId={ConversationId} EffectId={EffectId} ProposalSetId={ProposalSetId} Action={Action} ProposalCount={ProposalCount} ToPersistCount={ToPersistCount} AlreadyPersistedCount={AlreadyPersistedCount} Proposals={Proposals}",
            context.ConversationId,
            context.EffectId,
            request.ProposalSetId,
            request.Action,
            validated.Proposals.Count,
            validated.ToPersist.Count,
            validated.Proposals.Count - validated.ToPersist.Count,
            JsonSerializer.Serialize(validated.Proposals));

        var persisted = new List<PersistedProposal>(validated.ToPersist.Count);
        foreach (var resolved in validated.ToPersist)
        {
            var proposal = proposalsById[resolved.ProposalId];
            var attempt = persisted.Count + 1;
            var itemStarted = Stopwatch.GetTimestamp();
            logger.LogInformation(
                "AiCoach.ProposalPersistence.ItemStarted ConversationId={ConversationId} EffectId={EffectId} ProposalSetId={ProposalSetId} ProposalId={ProposalId} Attempt={Attempt} Total={Total} Title={Title} Description={Description}",
                context.ConversationId,
                context.EffectId,
                request.ProposalSetId,
                proposal.ProposalId,
                attempt,
                validated.ToPersist.Count,
                proposal.Title,
                proposal.Description);
            try
            {
                var taskId = await addTaskCommandHandler.Handle(new AddTaskCommand
                {
                    UserId = context.UserId,
                    TaskDetails = new AddTaskItemDto
                    {
                        Title = proposal.Title,
                        Description = proposal.Description ?? string.Empty,
                        StartTime = resolved.StartUtc,
                        EndTime = resolved.EndUtc,
                        TimeType = TaskTimeType.RangeTime,
                        LabelId = proposal.LabelId,
                    },
                }, ct);

                persisted.Add(new PersistedProposal(proposal.ProposalId, taskId));
                logger.LogInformation(
                    "AiCoach.ProposalPersistence.ItemCommitted ConversationId={ConversationId} EffectId={EffectId} ProposalSetId={ProposalSetId} ProposalId={ProposalId} TaskId={TaskId} Attempt={Attempt} ElapsedMs={ElapsedMs} Title={Title} Description={Description}",
                    context.ConversationId,
                    context.EffectId,
                    request.ProposalSetId,
                    proposal.ProposalId,
                    taskId,
                    attempt,
                    Stopwatch.GetElapsedTime(itemStarted).TotalMilliseconds,
                    proposal.Title,
                    proposal.Description);
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "AiCoach.ProposalPersistence.Failed ConversationId={ConversationId} EffectId={EffectId} ProposalSetId={ProposalSetId} ProposalId={ProposalId} Result={Result} ExceptionType={ExceptionType} ExceptionMessage={ExceptionMessage} PersistedCount={PersistedCount} Total={Total} Attempt={Attempt} ElapsedMs={ElapsedMs} Title={Title} Description={Description}",
                    context.ConversationId,
                    context.EffectId,
                    request.ProposalSetId,
                    proposal.ProposalId,
                    "TaskPersistenceFailed",
                    ex.GetType().Name,
                    ex.Message,
                    persisted.Count,
                    validated.ToPersist.Count,
                    attempt,
                    Stopwatch.GetElapsedTime(effectStarted).TotalMilliseconds,
                    proposal.Title,
                    proposal.Description);
                return new ProposalSetPersistenceFailed(
                    context.EffectId, request.ProposalSetId, "TaskPersistenceFailed", persisted);
            }
        }

        // Proposals saved on an earlier attempt count toward the final result too.
        var alreadyPersisted = validated.Proposals
            .Where(p => p.PersistedTaskId.HasValue)
            .Select(p => new PersistedProposal(p.ProposalId, p.PersistedTaskId!.Value))
            .ToList();

        logger.LogInformation(
            "AiCoach.ProposalPersistence.Completed ConversationId={ConversationId} EffectId={EffectId} ProposalSetId={ProposalSetId} Action={Action} PersistedCount={PersistedCount} NewlyPersistedCount={NewlyPersistedCount} ElapsedMs={ElapsedMs} Result={Result}",
            context.ConversationId,
            context.EffectId,
            request.ProposalSetId,
            request.Action,
            alreadyPersisted.Count + persisted.Count,
            persisted.Count,
            Stopwatch.GetElapsedTime(effectStarted).TotalMilliseconds,
            "Committed");

        return new ProposalSetPersistenceSucceeded(
            context.EffectId,
            request.ProposalSetId,
            alreadyPersisted.Concat(persisted).ToList(),
            request.Action,
            validated.FocusMinutes);
    }
}
