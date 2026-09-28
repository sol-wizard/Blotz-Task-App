using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

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
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await db.SaveChangesAsync(timeout.Token);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "AiCoach diagnostic trace incomplete for {ConversationId}, turn {TurnId}, event {EventKind}",
                conversationId, turnId, kind);
        }
    }
}
