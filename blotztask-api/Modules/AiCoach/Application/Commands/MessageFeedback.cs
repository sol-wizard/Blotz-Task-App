using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public sealed record MessageFeedbackRequest(
    [Required] string Rating,
    [StringLength(64)] string? Reason,
    [StringLength(500)] string? Detail);

public sealed record MessageFeedbackDto(Guid AssistantMessageId, string Rating,
    string? Reason, string? Detail);

public sealed class MessageFeedbackHandler(IConversationStore store, BlotzTaskDbContext db,
    TimeProvider clock)
{
    public async Task<IReadOnlyList<MessageFeedbackDto>> ListAsync(Guid userId, Guid conversationId,
        CancellationToken ct)
    {
        await EnsureOwnedAsync(userId, conversationId, ct);
        return await db.AiCoachFeedback.AsNoTracking()
            .Where(x => x.UserId == userId && x.ConversationId == conversationId)
            .Select(x => new MessageFeedbackDto(x.AssistantMessageId, x.Rating, x.Reason, x.Detail))
            .ToArrayAsync(ct);
    }

    public async Task<MessageFeedbackDto> PutAsync(Guid userId, Guid conversationId,
        Guid assistantMessageId, MessageFeedbackRequest request, CancellationToken ct)
    {
        if (request.Rating is not ("up" or "down"))
            throw new ValidationException("Rating must be up or down.");
        var target = await FindAssistantAsync(userId, conversationId, assistantMessageId, ct);
        var feedback = await db.AiCoachFeedback.FindAsync([userId, assistantMessageId], ct);
        var now = clock.GetUtcNow();
        if (feedback is null)
        {
            feedback = new AiCoachFeedback
            {
                UserId = userId,
                ConversationId = conversationId,
                AssistantMessageId = assistantMessageId,
                TurnId = target.TurnId!.Value,
                CreatedAt = now,
            };
            db.AiCoachFeedback.Add(feedback);
        }
        feedback.Rating = request.Rating;
        feedback.Reason = request.Rating == "down" ? request.Reason?.Trim() : null;
        feedback.Detail = request.Rating == "down" ? request.Detail?.Trim() : null;
        feedback.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return new(feedback.AssistantMessageId, feedback.Rating, feedback.Reason, feedback.Detail);
    }

    public async Task DeleteAsync(Guid userId, Guid conversationId, Guid assistantMessageId,
        CancellationToken ct)
    {
        await FindAssistantAsync(userId, conversationId, assistantMessageId, ct);
        await db.AiCoachFeedback
            .Where(x => x.UserId == userId && x.AssistantMessageId == assistantMessageId)
            .ExecuteDeleteAsync(ct);
    }

    private async Task EnsureOwnedAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        using var held = await store.AcquireLockAsync(conversationId, ct);
        _ = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
    }

    private async Task<ConversationMessage> FindAssistantAsync(Guid userId, Guid conversationId,
        Guid assistantMessageId, CancellationToken ct)
    {
        using var held = await store.AcquireLockAsync(conversationId, ct);
        var conversation = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
        var target = conversation.Messages.FirstOrDefault(x => x.Id == assistantMessageId
            && x.Role == ConversationMessageRole.Assistant && x.TurnId.HasValue);
        return target ?? throw new ConversationNotFoundException();
    }
}
