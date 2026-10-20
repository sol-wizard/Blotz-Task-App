using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachTraceRetentionService(
    IServiceScopeFactory scopes, TimeProvider clock,
    IOptions<AiCoachModuleOptions> options, ILogger<AiCoachTraceRetentionService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try
            {
                await CleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AiCoach diagnostic retention cleanup failed");
            }
            try
            {
                if (!await timer.WaitForNextTickAsync(stoppingToken)) return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
        } while (!stoppingToken.IsCancellationRequested);
    }

    public async Task CleanupAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var now = clock.GetUtcNow();
        var cutoff = now.AddDays(-options.Value.MessageRetentionDays);
        var ids = await db.AiCoachMessages.Where(message => message.CreatedAt <= cutoff)
            .Select(message => message.ConversationId).Distinct().ToListAsync(ct);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        foreach (var id in ids)
        {
            var record = await db.AiCoachConversations.AsNoTracking().SingleOrDefaultAsync(record => record.Id == id, ct);
            if (record is null || record.SchemaVersion != ConversationSerializer.SchemaVersion) continue;
            var conversation = ConversationSerializer.Deserialize(record.Payload);
            // Do not race task persistence or a model turn; the next hourly run retries busy segments.
            conversation.ReleaseInterruptedWork(now,
                TimeSpan.FromSeconds(options.Value.ModelRequestTimeoutSeconds * options.Value.MaxModelCallsPerTurn) + TimeSpan.FromMinutes(2),
                TimeSpan.FromMinutes(5));
            if (conversation.RunningTurnId.HasValue || conversation.Drafts.Any(draft => draft.Status == ProposalSetStatus.Processing)) continue;
            var rows = await db.AiCoachMessages.AsNoTracking().Where(message => message.ConversationId == id)
                .OrderBy(message => message.CreatedAt).ThenBy(message => message.Id).ToListAsync(ct);
            conversation.Messages.AddRange(rows.Select(message => new ConversationMessage(message.Id, message.Role,
                message.Content, message.TaskContextRead, message.TurnId, message.CreatedAt,
                ConversationSerializer.DeserializeDrafts(message.DraftSnapshot))));
            conversation.PruneMessagesBefore(cutoff);
            // Rebuild only bounded retained context. Old summaries cannot reliably be redacted fact by fact.
            var bytes = 0;
            var recent = new List<ConversationMessage>();
            foreach (var message in conversation.Messages.AsEnumerable().Reverse())
            {
                bytes += System.Text.Encoding.UTF8.GetByteCount(message.Content) + 256;
                if (bytes > options.Value.ContextTokenBudget / 3) break;
                recent.Add(message);
            }
            foreach (var message in recent.AsEnumerable().Reverse())
            {
                conversation.History.Add(new GatewaySystemMessage($"Historical message time (data): {message.CreatedAt:O}; timezone {conversation.TimeZoneId}."));
                conversation.History.Add(message.Role == ConversationMessageRole.User
                    ? new GatewayUserMessage(message.Content) : new GatewayAssistantMessage(message.Content, []));
            }
            foreach (var key in conversation.Receipts.Keys.ToArray())
            {
                var receipt = conversation.Receipts[key];
                if (conversation.Drafts.All(draft => draft.Id != receipt.DraftId)) { conversation.Receipts.Remove(key); continue; }
                if (receipt.Result is not { } result) continue;
                conversation.Receipts[key] = receipt with { Result = new ConfirmDraftResultDto
                {
                    CommandId = result.CommandId, Status = result.Status, ErrorCode = result.ErrorCode,
                    PersistedEntities = result.PersistedEntities, ClientDirective = result.ClientDirective,
                    ConversationSnapshot = ConversationSnapshotProjector.ToDto(conversation),
                }};
            }
            var updated = await db.AiCoachConversations.Where(row => row.Id == id && row.Revision == record.Revision)
                .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.Payload, ConversationSerializer.Serialize(conversation))
                    .SetProperty(row => row.ClosingSummary, (string?)null)
                    .SetProperty(row => row.MessageCount, conversation.Messages.Count)
                    .SetProperty(row => row.Revision, record.Revision + 1), ct);
            if (updated == 0) continue;
            // Completed receipts contain reviewed text as well as IDs; prune that copy with its draft.
            var retainedDraftIds = conversation.Drafts.Select(draft => draft.Id).ToArray();
            await db.AiCoachDraftConfirmations.Where(receipt => receipt.ConversationId == id
                && !retainedDraftIds.Contains(receipt.DraftId)).ExecuteDeleteAsync(ct);
            await db.AiCoachMessages.Where(message => message.ConversationId == id && message.CreatedAt <= cutoff).ExecuteDeleteAsync(ct);
        }
        // The open segment is kept even when empty: clients hold its ID, and it is one row per user.
        var emptyIds = await db.AiCoachConversations.Where(record => record.EndedAt != null
                && !db.AiCoachMessages.Any(message => message.ConversationId == record.Id))
            .Select(record => record.Id).ToListAsync(ct);
        await db.AiCoachConversations.Where(record => emptyIds.Contains(record.Id) && record.EndedAt != null
                && !db.AiCoachMessages.Any(message => message.ConversationId == record.Id)).ExecuteDeleteAsync(ct);
        await db.AiCoachTraceEvents.Where(trace => trace.CreatedAt < now.AddDays(-options.Value.TraceRetentionDays)
            || emptyIds.Contains(trace.ConversationId) && !db.AiCoachConversations.Any(record => record.Id == trace.ConversationId))
            .ExecuteDeleteAsync(ct);
        await transaction.CommitAsync(ct);
        logger.LogInformation("AiCoach retention checked {SegmentCount} segments and removed {EmptyCount} empty segments", ids.Count, emptyIds.Count);
    }

}
