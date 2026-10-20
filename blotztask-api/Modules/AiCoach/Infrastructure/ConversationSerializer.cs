using System.Text.Json;
using System.Text.Json.Serialization;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>Persisted working state; visible messages are stored separately.</summary>
public static class ConversationSerializer
{
    /// <summary>Increment when a stored payload can no longer be read by the current types.</summary>
    public const int SchemaVersion = 2;

    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static string Serialize(Conversation conversation) =>
        JsonSerializer.Serialize(conversation, Options);

    public static Conversation Deserialize(string payload) =>
        JsonSerializer.Deserialize<Conversation>(payload, Options)
        ?? throw new JsonException("Conversation payload is empty.");

    public static string? SerializeDrafts(IReadOnlyList<ProposalSet>? drafts) =>
        drafts is null || drafts.Count == 0 ? null : JsonSerializer.Serialize(drafts, Options);

    public static IReadOnlyList<ProposalSet>? DeserializeDrafts(string? payload) =>
        payload is null ? null : JsonSerializer.Deserialize<ProposalSet[]>(payload, Options);
}
