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

    /// <summary>Optimistic concurrency: the conversationVersion the client last saw.</summary>
    public int? ExpectedVersion { get; init; }
    /// <summary>Current device IANA zone; older clients may omit it.</summary>
    public string? TimeZoneId { get; init; }
    /// <summary>"followup" when the user tapped a suggested next message; used for usage metrics only.</summary>
    [RegularExpression("^followup$")]
    public string? Source { get; init; }
    /// <summary>
    /// AI Coach model profile to use for this message, e.g. "luna6" or "sol". Dev and staging only
    /// (AiCoach:AllowModelOverride); ignored elsewhere and when it names no configured profile.
    /// </summary>
    [StringLength(64)]
    public string? Model { get; init; }
}

public class SendMessageCommand
{
    public Func<string, object, Task>? Stream { get; init; }
    public bool ReviewListEnabled { get; init; }
    public required Guid UserId { get; init; }
    public required Guid ConversationId { get; init; }
    public required Guid MessageId { get; init; }
    public required string Content { get; init; }
    public int? ExpectedVersion { get; init; }
    public string? TimeZoneId { get; init; }
    public string? Source { get; init; }
    /// <summary>
    /// AI Coach model profile to use for this message, e.g. "luna6" or "sol". Dev and staging only
    /// (AiCoach:AllowModelOverride); ignored elsewhere and when it names no configured profile.
    /// </summary>
    [StringLength(64)]
    public string? Model { get; init; }
}

public class SendMessageCommandHandler(ConversationApplication application)
{
    public Task<ConversationSnapshotDto> Handle(SendMessageCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Content))
            throw new ValidationException("Message must not be empty.");
        return application.SendAsync(command.UserId, command.ConversationId, command.MessageId,
            command.Content.Trim(), command.ExpectedVersion, ct, command.TimeZoneId, command.ReviewListEnabled, command.Stream,
            command.Source, command.Model);
    }
}
