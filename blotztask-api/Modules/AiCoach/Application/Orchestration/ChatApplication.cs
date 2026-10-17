using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Application.Orchestration;

public sealed record ChatTopicRequest([Required] string TimeZoneId);
public sealed record ChatTimelineItem(Guid MessageId, Guid ConversationId, string Role, string Content,
    DateTimeOffset CreatedAt, bool TopicStart, IReadOnlyList<ArtifactEnvelopeDto> DraftSnapshot);
public sealed record ChatTimelinePage(IReadOnlyList<ChatTimelineItem> Items, string? NextCursor);

public sealed class ChatApplication(BlotzTaskDbContext db, IConversationStore store,
    ConversationSegments segments, DraftScheduleChecker checker, TimeProvider clock)
{
    public async Task<ConversationSnapshotDto> OpenAsync(Guid userId, string timeZoneId, CancellationToken ct)
    {
        ValidateZone(timeZoneId);
        var opened = await segments.OpenAsync(userId, timeZoneId, ct);
        // Calendar reads run outside the state lock. Apply only assessments of unchanged drafts.
        var checks = new List<(Guid Id, int Version, ScheduleAssessment Assessment)>();
        foreach (var draft in opened.Drafts.Where(draft => draft.Status == ProposalSetStatus.Pending
                     && (draft.Schedule is null || draft.Schedule.CheckedAt < clock.GetUtcNow().AddMinutes(-10))))
            checks.Add((draft.Id, draft.Version, await checker.CheckAsync(userId, draft.Proposals, false, ct)));
        using var held = await store.AcquireLockAsync(opened.Id, ct);
        var current = await ConversationApplication.LoadOwnedAsync(store, userId, opened.Id, ct);
        ConversationApplication.RequireOpen(current);
        if (current.RunningTurnId is null && !current.Drafts.Any(draft => draft.Status == ProposalSetStatus.Processing))
        {
            var changed = false;
            foreach (var check in checks)
            {
                var draft = current.Drafts.SingleOrDefault(draft => draft.Id == check.Id
                    && draft.Version == check.Version && draft.Status == ProposalSetStatus.Pending);
                if (draft is null) continue;
                draft.SetSchedule(check.Assessment);
                current.UpdateDraftSnapshots(draft);
                changed = true;
            }
            if (changed) { current.Touch(); await store.SaveAsync(current, ct); }
        }
        return ConversationSnapshotProjector.ToDto(current);
    }

    public async Task<ConversationSnapshotDto> NewTopicAsync(Guid userId, string timeZoneId, CancellationToken ct)
    {
        ValidateZone(timeZoneId);
        return ConversationSnapshotProjector.ToDto(await segments.NewTopicAsync(userId, timeZoneId, ct));
    }

    public async Task<ChatTimelinePage> MessagesAsync(Guid userId, string? before, int limit, CancellationToken ct)
    {
        if (limit is < 1 or > 100) throw new ValidationException("Limit must be between 1 and 100.");
        var query = db.AiCoachMessages.AsNoTracking().Where(message => message.UserId == userId);
        if (before is not null)
        {
            Cursor cursor;
            try
            {
                if (before.Length > 512) throw new FormatException();
                cursor = JsonSerializer.Deserialize<Cursor>(WebEncoders.Base64UrlDecode(before)) ?? throw new FormatException();
                if (cursor.Id == Guid.Empty || cursor.CreatedAt == default) throw new FormatException();
            }
            catch (Exception error) when (error is FormatException or JsonException or ArgumentException)
            { throw new ValidationException("Invalid message cursor."); }
            query = query.Where(message => message.CreatedAt < cursor.CreatedAt
                || message.CreatedAt == cursor.CreatedAt && message.Id.CompareTo(cursor.Id) < 0);
        }
        var rows = await query.OrderByDescending(message => message.CreatedAt).ThenByDescending(message => message.Id)
            .Select(message => new
            {
                Message = message,
                TopicStart = !db.AiCoachMessages.Any(older => older.ConversationId == message.ConversationId
                    && (older.CreatedAt < message.CreatedAt
                        || older.CreatedAt == message.CreatedAt && older.Id.CompareTo(message.Id) < 0)),
            }).Take(limit + 1).ToListAsync(ct);
        var items = rows.Take(limit).Select(row => new ChatTimelineItem(row.Message.Id, row.Message.ConversationId,
            row.Message.Role == ConversationMessageRole.User ? "user" : "assistant", row.Message.Content,
            row.Message.CreatedAt, row.TopicStart,
            (ConversationSerializer.DeserializeDrafts(row.Message.DraftSnapshot) ?? [])
                .Select(draft => ConversationSnapshotProjector.ToDto(draft, true)).ToArray())).ToArray();
        var last = items.LastOrDefault();
        return new(items, rows.Count > limit && last is not null
            ? WebEncoders.Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new Cursor(last.CreatedAt, last.MessageId))) : null);
    }

    public async Task ClearAsync(Guid userId, CancellationToken ct)
    {
        using var userLock = await store.AcquireUserLockAsync(userId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var records = await db.AiCoachConversations.AsNoTracking()
            .Where(record => record.UserId == userId && record.EndedAt == null).ToListAsync(ct);
        foreach (var record in records)
        {
            var conversation = await store.FindAsync(record.Id, ct);
            if (conversation is not null) ConversationApplication.RequireIdle(conversation);
        }
        await db.AiCoachConversations.Where(record => record.UserId == userId).ExecuteDeleteAsync(ct);
        await db.AiCoachTraceEvents.Where(trace => trace.UserId == userId).ExecuteDeleteAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static void ValidateZone(string timeZoneId)
    {
        try { _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId); }
        catch (Exception error) when (error is TimeZoneNotFoundException or InvalidTimeZoneException or ArgumentException)
        { throw new ValidationException("A valid IANA time zone is required."); }
    }
    private sealed record Cursor(DateTimeOffset CreatedAt, Guid Id);
}
