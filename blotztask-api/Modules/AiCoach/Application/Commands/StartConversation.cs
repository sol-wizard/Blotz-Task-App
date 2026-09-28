using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public class StartConversationRequest
{
    /// <summary>IANA time zone of the user's device, e.g. "Australia/Sydney".</summary>
    [Required]
    public required string TimeZoneId { get; init; }

    public AiCoachMode Mode { get; init; } = AiCoachMode.Execution;
}

public class StartConversationCommand
{
    public required Guid UserId { get; init; }
    public required string TimeZoneId { get; init; }
    public AiCoachMode Mode { get; init; } = AiCoachMode.Execution;
}

/// <summary>Creates a session using the selected conversational preference.</summary>
public class StartConversationCommandHandler(
    IConversationStore store,
    IOptions<AiCoachModuleOptions> options,
    TimeProvider clock, AiCoachTraceRecorder? trace = null)
{
    public async Task<ConversationSnapshotDto> Handle(StartConversationCommand command, CancellationToken ct = default)
    {
        try
        {
            _ = TimeZoneInfo.FindSystemTimeZoneById(command.TimeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ValidationException($"Unknown time zone '{command.TimeZoneId}'.");
        }

        if (!Enum.IsDefined(command.Mode))
            throw new ValidationException($"AI coach mode '{command.Mode}' is not available.");

        var now = clock.GetUtcNow();

        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Mode = command.Mode,
            TimeZoneId = command.TimeZoneId,
            CreatedAt = now,
            ExpiresAt = now.AddHours(options.Value.ConversationLifetimeHours),
        };

        await store.SaveAsync(conversation, ct);
        if (trace is not null)
            await trace.RecordAsync(command.UserId, conversation.Id, null, "conversation_started", new
            {
                mode = conversation.Mode.ToString(), conversation.TimeZoneId,
                conversation.CreatedAt, conversation.ExpiresAt,
            });
        return ConversationSnapshotProjector.ToDto(conversation);
    }
}
