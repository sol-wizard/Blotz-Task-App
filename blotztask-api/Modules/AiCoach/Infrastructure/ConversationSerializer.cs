using System.Text.Json;
using System.Text.Json.Serialization;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>Persisted JSON format of the whole conversation aggregate.</summary>
public static class ConversationSerializer
{
    /// <summary>Increment when a stored payload can no longer be read by the current types.</summary>
    public const int SchemaVersion = 1;

    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static string Serialize(Conversation conversation) =>
        JsonSerializer.Serialize(conversation, Options);

    public static Conversation Deserialize(string payload) =>
        JsonSerializer.Deserialize<Conversation>(payload, Options)
        ?? throw new JsonException("Conversation payload is empty.");
}
