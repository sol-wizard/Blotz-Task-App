using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.ModelTurn;

public sealed class AiCoachMemoryPreparer(BlotzTaskDbContext db) : IModelMemoryPreparer
{
    public async Task<PreparedMemoryContext> PrepareAsync(
        ModelTurnRequest request,
        TurnView turn,
        CancellationToken cancellationToken)
    {
        var turnNumbers = await db.AiConversationMessages
            .Where(message => message.ConversationId == request.Snapshot.ConversationId)
            .Select(message => message.TurnNumber)
            .Distinct()
            .OrderByDescending(turnNumber => turnNumber)
            .Take(request.Mode.MemoryProfile.RecentTurnLimit)
            .ToArrayAsync(cancellationToken);

        var messages = await db.AiConversationMessages
            .Where(message => message.ConversationId == request.Snapshot.ConversationId
                && turnNumbers.Contains(message.TurnNumber))
            .OrderBy(message => message.TurnNumber)
            .ThenBy(message => message.Sequence)
            .Select(message => new ModelMemoryMessage(
                message.Role,
                message.TurnNumber,
                message.Sequence,
                message.Content))
            .ToArrayAsync(cancellationToken);

        var timeZoneId = await db.AppUsers
            .Where(user => user.Id == request.Snapshot.UserId)
            .Select(user => user.Timezone)
            .SingleOrDefaultAsync(cancellationToken);

        var latestUserMessage = messages.LastOrDefault(message => message.Role == ConversationMessageRole.User)
            ?.Content ?? throw new ModelTurnViolationException("latest_user_message_missing");
        var priorAssistantMessages = messages
            .Where(message => message.Role == ConversationMessageRole.Assistant)
            .ToArray();
        var openQuestion = request.Snapshot.State == ConversationState.Clarifying
            ? priorAssistantMessages.LastOrDefault()?.Content
            : null;

        return new PreparedMemoryContext(
            request.Snapshot.State,
            new ClarificationProgressSnapshot(priorAssistantMessages.Length, openQuestion),
            messages,
            string.IsNullOrWhiteSpace(timeZoneId) ? "UTC" : timeZoneId,
            latestUserMessage);
    }
}
