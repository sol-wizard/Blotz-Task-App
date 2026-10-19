using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Orchestration;

/// <summary>Coordinates user-level topic boundaries; model calls run after releasing state locks.</summary>
public sealed class ConversationSegments(IConversationStore store, ClosingSummaryGenerator summaries,
    TimeProvider clock, IOptions<AiCoachModuleOptions> options, ILogger<ConversationSegments> logger)
{
    public async Task<Conversation> OpenAsync(Guid userId, string timeZoneId, CancellationToken ct)
    {
        _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        using var userLock = await store.AcquireUserLockAsync(userId, ct);
        var current = await store.FindOpenAsync(userId, ct);
        if (current is { EndedAt: null }) return current;
        var created = new Conversation
        {
            Id = Guid.NewGuid(), UserId = userId,
            TimeZoneId = timeZoneId, CreatedAt = clock.GetUtcNow(),
        };
        try { await store.CreateAsync(created, ct); }
        catch (DbUpdateException error) when (error.InnerException is SqlException { Number: 2601 or 2627 })
        {
            // Another instance can win creation; the filtered unique index is the final arbiter.
            var winner = await store.FindOpenAsync(userId, ct);
            if (winner is not { EndedAt: null }) throw;
            return winner;
        }
        return created;
    }

    public async Task<Conversation> NewTopicAsync(Guid userId, string timeZoneId, CancellationToken ct)
    {
        _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        Conversation? ended = null;
        using (await store.AcquireUserLockAsync(userId, ct))
        {
            var current = await store.FindOpenAsync(userId, ct);
            if (current is not null)
            {
                using var held = await store.AcquireLockAsync(current.Id, ct);
                current = await ConversationApplication.LoadOwnedAsync(store, userId, current.Id, ct);
                ConversationApplication.RequireOpen(current);
                ConversationApplication.RequireIdle(current);
                if (current.Messages.Count == 0)
                {
                    if (current.ChangeTimeZone(timeZoneId, clock.GetUtcNow())) await store.SaveAsync(current, ct);
                    return current;
                }
                if (current.End(clock.GetUtcNow()))
                {
                    await store.SaveAsync(current, ct);
                    ended = current;
                }
            }
        }
        var next = await OpenAsync(userId, timeZoneId, ct);
        if (ended is not null) await TrySummarizeAsync(ended, ct);
        return next;
    }

    public async Task<(Guid ConversationId, int? ExpectedVersion, Conversation? Ended)> PrepareSendAsync(Guid userId,
        Guid conversationId, Guid messageId, int? expectedVersion, CancellationToken ct, string? timeZoneId = null)
    {
        Conversation ended;
        using (await store.AcquireUserLockAsync(userId, ct))
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var current = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
            ConversationApplication.RequireOpen(current);
            // Retries belong to the original turn and must not create a topic boundary.
            if (current.Messages.Any(message => message.Id == messageId)) return (conversationId, expectedVersion, null);
            ConversationApplication.RequireIdle(current);
            if (expectedVersion.HasValue && current.Version != expectedVersion)
                throw new ConversationVersionConflictException(current);
            if (!current.IsIdleBeyond(clock.GetUtcNow(), TimeSpan.FromHours(options.Value.TopicIdleHours)))
                return (conversationId, expectedVersion, null);
            current.End(clock.GetUtcNow());
            await store.SaveAsync(current, ct);
            ended = current;
        }
        var next = await OpenAsync(userId, timeZoneId ?? ended.TimeZoneId, ct);
        return (next.Id, next.Version, ended);
    }

    public async Task TrySummarizeAsync(Conversation ended, CancellationToken ct)
    {
        // Optional context gets a small independent budget; never hold state locks during this call.
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(options.Value.ClosingSummaryTimeoutSeconds));
        try
        {
            var summary = await summaries.GenerateAsync(ended, timeout.Token);
            await store.SaveClosingSummaryAsync(ended, summary, timeout.Token);
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "AiCoach closing summary failed for ended segment {ConversationId}; continuing without it", ended.Id);
        }
    }
}
