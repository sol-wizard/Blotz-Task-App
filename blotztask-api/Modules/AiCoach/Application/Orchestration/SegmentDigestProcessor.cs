using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Domain;
using BlotzTask.Modules.UserUnderstanding.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Orchestration;

/// <summary>
/// Reads finished stretches of chat in the background: learns memories from new user messages and writes the
/// closing summary once a topic has ended or gone idle long enough to end on the next send. Progress is a
/// stored cursor, so a restart or a failed call is simply retried on a later pass.
/// </summary>
public sealed class SegmentDigestProcessor(BlotzTaskDbContext db, IConversationStore store,
    SegmentDigestGenerator generator, RememberUserMemoryCommandHandler remember,
    GetUserContextQueryHandler userContext, TimeProvider clock, IOptions<AiCoachModuleOptions> options,
    ILogger<SegmentDigestProcessor> logger)
{
    /// <summary>Learning waits for a pause so one call covers a whole exchange.</summary>
    public static readonly TimeSpan PauseBeforeLearning = TimeSpan.FromMinutes(10);
    /// <summary>Older chats are left alone, so a backlog never turns into a burst of model calls.</summary>
    public static readonly TimeSpan Lookback = TimeSpan.FromDays(3);
    public const int BatchSize = 20;
    /// <summary>Below this much new user text a call cannot find anything worth remembering.</summary>
    public const int MinUserCharacters = 20;

    public async Task<int> ProcessBatchAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var pauseCutoff = now - PauseBeforeLearning;
        var topicCutoff = now - TimeSpan.FromHours(options.Value.TopicIdleHours);
        var lookback = now - Lookback;
        var ids = await db.AiCoachConversations.AsNoTracking()
            .Where(r => r.MessageCount > 0 && r.LastActivityAt >= lookback
                        && r.SchemaVersion == ConversationSerializer.SchemaVersion)
            .Select(r => new
            {
                r.Id, r.ClosingSummary, r.EndedAt, r.MemoryProcessedAt, r.LastActivityAt,
                LastMessageAt = db.AiCoachMessages.Where(m => m.ConversationId == r.Id).Max(m => (DateTimeOffset?)m.CreatedAt),
            })
            .Where(x => x.LastMessageAt != null
                        && ((x.ClosingSummary == null && (x.EndedAt != null || x.LastMessageAt <= topicCutoff))
                            || ((x.EndedAt != null || x.LastMessageAt <= pauseCutoff)
                                && db.AiCoachMessages.Any(m => m.ConversationId == x.Id
                                    && m.Role == ConversationMessageRole.User && m.CreatedAt > x.MemoryProcessedAt))))
            .OrderBy(x => x.LastActivityAt)
            .Select(x => x.Id)
            .Take(BatchSize)
            .ToListAsync(ct);
        foreach (var id in ids)
        {
            try { await ProcessAsync(id, ct); }
            catch (Exception error) when (error is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                // Transient: the cursor did not move, so the next pass tries again.
                logger.LogWarning(error, "AiCoach digest failed for {ConversationId}; will retry", id);
            }
        }
        return ids.Count;
    }

    public async Task ProcessAsync(Guid conversationId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var record = await db.AiCoachConversations.AsNoTracking().SingleOrDefaultAsync(r => r.Id == conversationId, ct);
        if (record is null) return;
        var conversation = await store.FindAsync(conversationId, ct);
        if (conversation is null || conversation.RunningTurnId.HasValue || conversation.Messages.Count == 0) return;

        var lastMessageAt = conversation.Messages[^1].CreatedAt;
        var settled = record.EndedAt.HasValue || now - lastMessageAt >= PauseBeforeLearning;
        var needsSummary = record.ClosingSummary is null
                           && (record.EndedAt.HasValue || now - lastMessageAt > TimeSpan.FromHours(options.Value.TopicIdleHours));
        var newMessages = await db.AiCoachMessages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId && m.CreatedAt > record.MemoryProcessedAt)
            .OrderBy(m => m.CreatedAt).ThenBy(m => m.Id)
            .Select(m => new DigestMessage(m.Id, m.Role, m.Content, m.CreatedAt))
            .ToListAsync(ct);
        var enabled = await userContext.IsMemoryEnabledAsync(conversation.UserId, ct);
        var enoughText = newMessages.Where(m => m.Role == ConversationMessageRole.User)
            .Sum(m => m.Content.Trim().Length) >= MinUserCharacters;
        var learn = settled && enabled && enoughText;
        // While memory is off, or there is nothing to learn, settled messages are passed over for good.
        var processedThrough = settled && newMessages.Count > 0 ? newMessages[^1].CreatedAt : record.MemoryProcessedAt;
        if (!needsSummary && !learn && processedThrough == record.MemoryProcessedAt) return;

        string? summary = null;
        if (needsSummary || learn)
        {
            var active = learn
                ? await db.UserMemories.AsNoTracking()
                    .Where(m => m.UserId == conversation.UserId && m.Status == UserMemoryStatus.Active
                                && (m.ValidUntil == null || m.ValidUntil > now))
                    .ToListAsync(ct)
                : [];
            SegmentDigest digest;
            try
            {
                digest = await generator.GenerateAsync(conversation, needsSummary, newMessages, active, learn, now, ct);
            }
            catch (Exception error) when (error is AiQuotaExceededException or NotFoundException)
            {
                // Background work never goes past the user's quota (or runs without a plan); it resumes when allowed.
                logger.LogInformation("AiCoach digest skipped for {ConversationId}: no quota available", conversationId);
                return;
            }
            catch (ModelContextException error) when (error.Code is "digest_unreadable" or "digest_context_limit")
            {
                // Retrying would fail the same way; give up on this stretch rather than loop on it.
                logger.LogWarning("AiCoach digest gave up on {ConversationId}: {Code}", conversationId, error.Code);
                digest = new("", []);
            }
            summary = needsSummary ? digest.Summary ?? "" : null;
            foreach (var candidate in digest.Memories)
            {
                var stored = await remember.Handle(new RememberUserMemoryCommand
                {
                    UserId = conversation.UserId,
                    Kind = candidate.Kind,
                    Content = candidate.Content,
                    ValidUntil = candidate.ValidThrough is { } day ? UserMemory.EndOfLocalDay(day, conversation.TimeZoneId) : null,
                    ReplacesRef = candidate.Replaces,
                    SourceMessageId = candidate.Source.Id,
                    Evidence = candidate.Source.Content,
                    Source = UserMemorySource.Extracted,
                }, ct);
                if (!stored.Success)
                    logger.LogInformation("AiCoach digest candidate not stored for {ConversationId}: {Code}",
                        conversationId, stored.ErrorCode);
            }
        }

        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var savedSummary = summary is not null && await db.AiCoachConversations
                .Where(r => r.Id == conversationId && r.Revision == record.Revision && r.ClosingSummary == null)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.ClosingSummary, summary)
                    .SetProperty(r => r.MemoryProcessedAt, processedThrough)
                    .SetProperty(r => r.Revision, r => r.Revision + 1), ct) > 0;
            // The cursor only moves forward from where this pass started; a concurrent pass wins otherwise.
            if (!savedSummary && processedThrough > record.MemoryProcessedAt)
                await db.AiCoachConversations
                    .Where(r => r.Id == conversationId && r.MemoryProcessedAt == record.MemoryProcessedAt)
                    .ExecuteUpdateAsync(s => s.SetProperty(r => r.MemoryProcessedAt, processedThrough), ct);
            if (summary is not null && !savedSummary)
                logger.LogInformation("AiCoach discarded digest summary for {ConversationId}: segment changed", conversationId);
        }
    }
}

/// <summary>Runs the digest processor every two minutes in its own scope.</summary>
public sealed class SegmentDigestService(IServiceScopeFactory scopes, ILogger<SegmentDigestService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(2));
        try
        {
            do
            {
                try
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<SegmentDigestProcessor>().ProcessBatchAsync(stoppingToken);
                }
                catch (Exception error) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogError(error, "AiCoach digest pass failed");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
