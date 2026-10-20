using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachTraceRecorder(
    IServiceScopeFactory scopes, TimeProvider clock, ILogger<AiCoachTraceRecorder> logger)
{
    public async Task RecordAsync(Guid userId, Guid conversationId, Guid? turnId,
        string kind, object payload, Guid? assistantMessageId = null)
    {
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
}
