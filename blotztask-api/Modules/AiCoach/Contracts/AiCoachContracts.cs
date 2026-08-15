using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Domain;

namespace BlotzTask.Modules.AiCoach.Contracts;

public static class AiCoachProtocol
{
    public const int CurrentVersion = 1;
    public static void EnsureSupported(int protocolVersion)
    {
        if (protocolVersion != CurrentVersion)
            throw new ValidationException($"Unsupported AI Coach protocol version '{protocolVersion}'.");
    }
}

public static class ProtocolValue
{
    public static string From<TEnum>(TEnum value) where TEnum : struct, Enum =>
        string.Concat(value.ToString().Select((character, index) =>
            index > 0 && char.IsUpper(character)
                ? $"_{char.ToLowerInvariant(character)}"
                : char.ToLowerInvariant(character).ToString()));
}

public sealed record ClientArtifactCapabilities(
    IReadOnlyDictionary<string, IReadOnlyList<int>> SupportedArtifacts)
{
    public static ClientArtifactCapabilities Foundation { get; } = new(
        new Dictionary<string, IReadOnlyList<int>> { ["task_draft"] = new[] { 1 } });

    public bool Supports(string artifactType, int schemaVersion) =>
        SupportedArtifacts is not null
        && SupportedArtifacts.TryGetValue(artifactType, out var versions)
        && versions.Contains(schemaVersion);
}

public sealed class CreateAiConversationRequest
{
    [Range(AiCoachProtocol.CurrentVersion, AiCoachProtocol.CurrentVersion)]
    public int ProtocolVersion { get; init; } = AiCoachProtocol.CurrentVersion;
    [Required] public required AiCoachMode Mode { get; init; }
    public ClientArtifactCapabilities ClientCapabilities { get; init; } = ClientArtifactCapabilities.Foundation;
}

public sealed class SendAiCoachMessageRequest
{
    [Range(AiCoachProtocol.CurrentVersion, AiCoachProtocol.CurrentVersion)]
    public int ProtocolVersion { get; init; } = AiCoachProtocol.CurrentVersion;
    [Range(1, int.MaxValue)] public int ExpectedVersion { get; init; }
    [Required, StringLength(10_000, MinimumLength = 1)] public required string Content { get; init; }
    public ClientArtifactCapabilities ClientCapabilities { get; init; } = ClientArtifactCapabilities.Foundation;
}

public sealed record ConversationMessageDto(Guid Id, int TurnNumber, int Sequence, string Role,
    string Content, Guid? ArtifactId, DateTimeOffset CreatedAt);

public sealed record TaskDraftPayloadDto(string Kind, string Title, string? Description,
    DateTimeOffset StartTimeUtc, DateTimeOffset EndTimeUtc, string TimeZoneId,
    DateOnly StartDateLocal, DateOnly EndDateLocal, int? LabelId);

public sealed record CurrentArtifactDto(Guid Id, string Type, int SchemaVersion, int Version,
    string Status, JsonElement? Payload, IReadOnlyList<string> AllowedActions,
    bool RequiresClientUpgrade);

public sealed record ConversationSnapshotDto(
    int ProtocolVersion, Guid ConversationId, int ConversationVersion,
    string Mode, string LifecycleStatus, string State, string GenerationStatus,
    string? BlockedReason, string? AssistantMessage, CurrentArtifactDto? CurrentArtifact,
    IReadOnlyList<ConversationMessageDto> Messages, IReadOnlyList<string> AllowedActions,
    IReadOnlyDictionary<string, IReadOnlyList<int>> ServerSupportedArtifacts);

public sealed record ConversationCommandResultDto(
    bool Accepted, string? RejectionReason, ConversationSnapshotDto Snapshot);
