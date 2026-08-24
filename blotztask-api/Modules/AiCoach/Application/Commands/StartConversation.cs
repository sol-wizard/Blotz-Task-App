using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public class StartConversationRequest
{
    /// <summary>IANA time zone of the user's device, e.g. "Australia/Sydney".</summary>
    [Required]
    public required string TimeZoneId { get; init; }
}

public class StartConversationCommand
{
    public required Guid UserId { get; init; }
    public required string TimeZoneId { get; init; }
}

/// <summary>
/// Creates a fresh Execution-mode conversation (every entry into Execution mode starts a new
/// in-memory session). Runtime versions are pinned at creation (v3 §6) from the mode
/// definition; an active conversation never picks up new versions on deploy.
/// </summary>
public class StartConversationCommandHandler(
    IConversationStore store,
    ModeDefinitionRegistry modeRegistry,
    IOptions<AiCoachModuleOptions> options,
    TimeProvider clock)
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

        var mode = modeRegistry.Get(AiCoachMode.Execution);
        var now = clock.GetUtcNow();

        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Mode = AiCoachMode.Execution,
            TimeZoneId = command.TimeZoneId,
            RuntimeVersions = mode.ToRuntimeVersions(protocolVersion: 2),
            CreatedAt = now,
            ExpiresAt = now.AddHours(options.Value.ConversationLifetimeHours),
        };

        await store.SaveAsync(conversation, ct);
        return ConversationSnapshotProjector.ToDto(conversation);
    }
}
