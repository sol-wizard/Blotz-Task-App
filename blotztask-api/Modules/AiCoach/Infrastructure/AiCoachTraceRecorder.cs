using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachTraceRecorder(
    IServiceScopeFactory scopes, TimeProvider clock, ILogger<AiCoachTraceRecorder> logger)
{
    public async Task RecordAsync(Guid userId, Guid conversationId, Guid? turnId,
        string kind, object payload, Guid? assistantMessageId = null)
    {
        if (payload is TraceToolSet toolSet)
        {
            await SaveToolSetAsync(toolSet);
            return;
        }
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, timeout.Token);
            if (!await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(
                    db.AiCoachConversations.Where(record => record.Id == conversationId && record.UserId == userId), timeout.Token))
                return;
            db.AiCoachTraceEvents.Add(new AiCoachTraceEvent
            {
                UserId = userId,
                ConversationId = conversationId,
                TurnId = turnId,
                AssistantMessageId = assistantMessageId,
                Kind = kind,
                Payload = JsonSerializer.Serialize(payload),
                CreatedAt = clock.GetUtcNow(),
            });
            await db.SaveChangesAsync(timeout.Token);
            await transaction.CommitAsync(timeout.Token);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "AiCoach diagnostic trace incomplete for {ConversationId}, turn {TurnId}, event {EventKind}",
                conversationId, turnId, kind);
        }
    }

    // A missing summary must not fail the turn or digest; it is logged like a missing trace event.
    public async Task RecordSummaryAsync(AiCoachTurnSummary summary)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            if (summary.ToolNames is { Length: > 1000 }) summary.ToolNames = summary.ToolNames[..1000];
            summary.CreatedAt = clock.GetUtcNow();
            db.AiCoachTurnSummaries.Add(summary);
            await db.SaveChangesAsync(timeout.Token);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach {SummaryKind} summary was not saved for {ConversationId}, turn {TurnId}",
                summary.Kind, summary.ConversationId, summary.TurnId);
        }
    }

    /// <summary>Marks every turn that shaped the draft with the user's final action on it.</summary>
    public Task RecordDraftOutcomeAsync(Guid userId, Guid draftId, string outcome, int? savedItemCount)
    {
        var now = clock.GetUtcNow();
        return UpdateDraftSummariesAsync(userId, draftId, outcome, rows => rows
            .Where(summary => summary.DraftOutcome == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(summary => summary.DraftOutcome, outcome)
                .SetProperty(summary => summary.DraftSavedItemCount, savedItemCount)
                .SetProperty(summary => summary.DraftOutcomeAt, now)));
    }

    public Task RecordDraftEditAsync(Guid userId, Guid draftId) =>
        UpdateDraftSummariesAsync(userId, draftId, "edited", rows => rows
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(summary => summary.DraftUserEditCount, summary => summary.DraftUserEditCount + 1)));

    private async Task UpdateDraftSummariesAsync(Guid userId, Guid draftId, string action,
        Func<IQueryable<AiCoachTurnSummary>, Task<int>> update)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
            await update(db.AiCoachTurnSummaries.Where(summary => summary.UserId == userId && summary.DraftId == draftId));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach draft {DraftAction} was not recorded in summaries for draft {DraftId}", action, draftId);
        }
    }

    // Shared, user-free rows: insert once and treat a concurrent insert of the same hash as success.
    private async Task SaveToolSetAsync(TraceToolSet toolSet)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            if (await db.AiCoachToolSets.AnyAsync(set => set.Hash == toolSet.Hash, timeout.Token)) return;
            db.AiCoachToolSets.Add(new AiCoachToolSet
            {
                Hash = toolSet.Hash,
                Definitions = toolSet.DefinitionsJson,
                CreatedAt = clock.GetUtcNow(),
            });
            try
            {
                await db.SaveChangesAsync(timeout.Token);
            }
            catch (DbUpdateException)
            {
                db.ChangeTracker.Clear();
                if (!await db.AiCoachToolSets.AnyAsync(set => set.Hash == toolSet.Hash, timeout.Token)) throw;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach tool set {ToolSetHash} was not saved", toolSet.Hash);
        }
    }
}
