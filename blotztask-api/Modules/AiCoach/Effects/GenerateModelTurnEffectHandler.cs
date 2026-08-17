using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.ModelTurn;
using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.AiCoach.Services;
using BlotzTask.Modules.AiCoach.StateMachine;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Effects;

public sealed class GenerateModelTurnEffectHandler(
    BlotzTaskDbContext db,
    IConversationSnapshotProjector projector,
    IAiCoachModeRegistry modes,
    IModelTurnPipeline pipeline,
    TimeProvider timeProvider) : IConversationEffectHandler
{
    public const string Type = "generate_model_turn";
    public const int Version = 1;
    string IConversationEffectHandler.EffectType => Type;
    int IConversationEffectHandler.SchemaVersion => Version;

    public async Task<ConversationEventResult> ExecuteAsync(
        AiConversationEffect effect,
        CancellationToken cancellationToken)
    {
        var conversation = await db.AiConversations
            .AsNoTracking()
            .Include(item => item.CurrentArtifact)
            .SingleAsync(item => item.Id == effect.ConversationId, cancellationToken);
        var latestUserMessage = await db.AiConversationMessages
            .AsNoTracking()
            .Where(message => message.ConversationId == effect.ConversationId
                && message.Role == ConversationMessageRole.User)
            .OrderByDescending(message => message.TurnNumber)
            .ThenByDescending(message => message.Sequence)
            .FirstAsync(cancellationToken);

        var (purpose, objective) = DetermineObjective(conversation.State);
        var request = new ModelTurnRequest(
            effect.Id,
            projector.ToDomain(conversation),
            modes.Get(conversation.Mode),
            new UserMessageReceived(
                latestUserMessage.Id,
                latestUserMessage.Content,
                latestUserMessage.CreatedAt),
            purpose,
            objective,
            null,
            ModelTurnLimits.Foundation);
        var result = await pipeline.ExecuteAsync(request, cancellationToken);
        var now = timeProvider.GetUtcNow();

        ConversationEvent resultEvent = result.CompletionReason switch
        {
            ModelTurnCompletionReason.Completed
                when result.Outcome is { Kind: ControlledModelOutcomeKind.Reply } outcome
                    && result.Turn.ProposedArtifact is { } proposal =>
                new OneOffTaskDraftProposed(
                    effect.Id,
                    effect.BaseConversationVersion,
                    outcome,
                    proposal,
                    now),
            ModelTurnCompletionReason.Completed
                when result.Outcome is { Kind: ControlledModelOutcomeKind.Clarification } outcome =>
                new ClarificationRequested(effect.Id, effect.BaseConversationVersion, outcome, now),
            ModelTurnCompletionReason.Completed when result.Outcome is not null =>
                new ModelTurnCompleted(effect.Id, effect.BaseConversationVersion, result.Outcome, now),
            ModelTurnCompletionReason.QuotaExceeded =>
                new QuotaBlocked(effect.Id, effect.BaseConversationVersion, now),
            ModelTurnCompletionReason.ContentFiltered =>
                new ContentFiltered(effect.Id, effect.BaseConversationVersion, now),
            _ => new ModelGenerationFailed(
                effect.Id,
                effect.BaseConversationVersion,
                result.FailureCode ?? "model_turn_failed",
                BlockedReason(result.CompletionReason),
                now)
        };

        return new ConversationEventResult(effect.Id, effect.BaseConversationVersion, resultEvent);
    }

    private static (ModelPurpose Purpose, TurnObjectiveKey Objective) DetermineObjective(
        ConversationState state) => state switch
        {
            ConversationState.Conversing => (
                ModelPurpose.Clarification,
                TurnObjectiveKey.ClarifyOneCoreRequirement),
            ConversationState.Clarifying => (
                ModelPurpose.TaskDraft,
                TurnObjectiveKey.ProposeOneOffTaskDraft),
            _ => throw new ModelTurnViolationException("model_turn_objective_not_supported")
        };

    private static GenerationBlockedReason BlockedReason(ModelTurnCompletionReason reason) => reason switch
    {
        ModelTurnCompletionReason.ConfigurationError => GenerationBlockedReason.ConfigurationError,
        ModelTurnCompletionReason.ContentFiltered => GenerationBlockedReason.ContentFiltered,
        ModelTurnCompletionReason.QuotaExceeded => GenerationBlockedReason.Quota,
        ModelTurnCompletionReason.ModelUnavailable
            or ModelTurnCompletionReason.RateLimited
            or ModelTurnCompletionReason.TimedOut => GenerationBlockedReason.ModelUnavailable,
        _ => GenerationBlockedReason.Other
    };
}
