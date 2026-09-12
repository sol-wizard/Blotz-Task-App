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

    public AiCoachMode Mode { get; init; } = AiCoachMode.Execution;
}

public class StartConversationCommand
{
    public required Guid UserId { get; init; }
    public required string TimeZoneId { get; init; }
    public AiCoachMode Mode { get; init; } = AiCoachMode.Execution;
}

/// <summary>
/// Creates a fresh registered-mode conversation. Execution and Companion both use a new
/// in-memory session in this implementation. Runtime versions are pinned at creation from the mode
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

        if (!modeRegistry.IsRegistered(command.Mode))
            throw new ValidationException($"AI coach mode '{command.Mode}' is not available.");

        var mode = modeRegistry.Get(command.Mode);
        var now = clock.GetUtcNow();

        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Mode = command.Mode,
            TimeZoneId = command.TimeZoneId,
            RuntimeVersions = mode.ToRuntimeVersions(protocolVersion: 2),
            CreatedAt = now,
            ExpiresAt = now.AddHours(options.Value.ConversationLifetimeHours),
        };

        await store.SaveAsync(conversation, ct);
        return ConversationSnapshotProjector.ToDto(conversation);
    }
}
