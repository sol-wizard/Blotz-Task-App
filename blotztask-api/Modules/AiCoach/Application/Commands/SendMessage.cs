using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public class SendMessageRequest
{
    /// <summary>Client-generated id for idempotent retries of the same message.</summary>
    public Guid? MessageId { get; init; }

    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public required string Content { get; init; }

    /// <summary>Optimistic concurrency (§18): the conversationVersion the client last saw.</summary>
    public int? ExpectedVersion { get; init; }
}

public class SendMessageCommand
{
    public required Guid UserId { get; init; }
    public required Guid ConversationId { get; init; }
    public required Guid MessageId { get; init; }
    public required string Content { get; init; }
    public int? ExpectedVersion { get; init; }
}

public class SendMessageCommandHandler(IConversationKernel kernel, TimeProvider clock)
{
    public async Task<ConversationSnapshotDto> Handle(SendMessageCommand command, CancellationToken ct = default)
    {
        var conversation = await kernel.DispatchAsync(
            command.UserId,
            command.ConversationId,
            command.ExpectedVersion,
            new UserMessageReceived(command.MessageId, command.Content.Trim(), clock.GetUtcNow()),
            ct);

        return ConversationSnapshotProjector.ToDto(conversation);
    }
}
