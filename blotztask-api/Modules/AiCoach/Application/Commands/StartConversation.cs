using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiCoach.Application.Orchestration;

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

/// <summary>Compatibility entry point: reuse the user's open topic, or create a Unified topic.</summary>
public class StartConversationCommandHandler(
    ConversationSegments segments, AiCoachTraceRecorder? trace = null)
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

        var conversation = await segments.OpenAsync(command.UserId, command.TimeZoneId, ct);
        if (trace is not null)
            await trace.RecordAsync(command.UserId, conversation.Id, null, "conversation_opened", new
            {
                mode = conversation.Mode.ToString(), conversation.TimeZoneId,
                conversation.CreatedAt,
            });
        return ConversationSnapshotProjector.ToDto(conversation);
    }
}
