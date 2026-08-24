using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public class RejectDraftRequest
{
    public required Guid CommandId { get; init; }
    public required int ExpectedConversationVersion { get; init; }
}

public class RejectDraftCommand
{
    public required Guid UserId { get; init; }
    public required Guid ConversationId { get; init; }
    public required Guid DraftId { get; init; }
    public required RejectDraftRequest Request { get; init; }
}

/// <summary>
/// "不要这个": single short transition — artifact Rejected, current pointer cleared, back to
/// Conversing. No task is created and no new draft is auto-generated (requirements §10.2, §22.8).
/// </summary>
public class RejectDraftCommandHandler(
    IConversationStore store,
    IConversationKernel kernel)
{
    private const string CommandType = "reject_draft";

    public async Task<ConversationSnapshotDto> Handle(RejectDraftCommand command, CancellationToken ct = default)
    {
        // Idempotent replay (§17.2).
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await store.FindAsync(command.ConversationId, ct);
            if (conversation is null || conversation.UserId != command.UserId)
                throw new ConversationNotFoundException();

            if (conversation.Receipts.TryGetValue(command.Request.CommandId, out var existing)
                && existing.Result is ConversationSnapshotDto replay)
                return replay;

            conversation.RecordReceipt(new CommandReceipt(
                command.Request.CommandId, command.DraftId, CommandType,
                RequestHash: command.DraftId.ToString(),
                CommandReceiptStatus.Pending, null));
            await store.SaveAsync(conversation, ct);
        }

        var updated = await kernel.DispatchAsync(
            command.UserId,
            command.ConversationId,
            command.Request.ExpectedConversationVersion,
            new RejectTaskDraftRequested(command.Request.CommandId, command.DraftId),
            ct);

        var dto = ConversationSnapshotProjector.ToDto(updated);

        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await store.FindAsync(command.ConversationId, ct);
            if (conversation is not null)
            {
                conversation.CompleteReceipt(command.Request.CommandId, CommandReceiptStatus.Succeeded, dto);
                await store.SaveAsync(conversation, ct);
            }
        }

        return dto;
    }
}
