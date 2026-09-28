using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public sealed record RejectDraftRequest(Guid CommandId, int ExpectedConversationVersion);
public sealed class RejectDraftCommand
{
    public required Guid UserId { get; init; }
    public required Guid ConversationId { get; init; }
    public required Guid DraftId { get; init; }
    public required RejectDraftRequest Request { get; init; }
}

public sealed class RejectDraftCommandHandler(IConversationStore store, AiCoachTraceRecorder? trace = null)
{
    public async Task<ConversationSnapshotDto> Handle(RejectDraftCommand command, CancellationToken ct = default)
    {
        ConversationSnapshotDto snapshot;
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, ct);
            var hash = DraftEditing.Hash(new { action = "discard", command.DraftId });
            if (conversation.Receipts.TryGetValue(command.Request.CommandId, out var receipt))
            {
                if (receipt.RequestHash != hash) throw new DraftConflictException("IdempotencyKeyReused", "Command ID was reused.");
                return ConversationSnapshotProjector.ToDto(conversation);
            }
            var draft = DraftEditing.Find(conversation, command.DraftId);
            DraftEditing.CheckEditable(conversation, draft, command.Request.ExpectedConversationVersion);
            draft.Discard();
            conversation.RecordDraftEvent("discarded_by_user", draft);
            snapshot = ConversationSnapshotProjector.ToDto(conversation);
            conversation.Receipts.Add(command.Request.CommandId, new(command.DraftId, hash, snapshot));
            await store.SaveAsync(conversation, ct);
        }
        if (trace is not null) await trace.RecordAsync(command.UserId, command.ConversationId, null, "draft_rejected",
            new { command.DraftId, command.Request.CommandId, snapshot.ConversationVersion });
        return snapshot;
    }
}
