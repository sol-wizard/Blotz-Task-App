using System.Text.Json;
using System.Text.Json.Nodes;
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

    public static Conversation Deserialize(string payload)
    {
        var node = JsonNode.Parse(payload) ?? throw new JsonException("Conversation payload is empty.");
        if (node["drafts"] is JsonArray drafts) DropTaskCards(drafts);
        return node.Deserialize<Conversation>(Options) ?? throw new JsonException("Conversation payload is empty.");
    }

    public static string? SerializeDrafts(IReadOnlyList<ProposalSet>? drafts) =>
        drafts is null || drafts.Count == 0 ? null : JsonSerializer.Serialize(drafts, Options);

    public static IReadOnlyList<ProposalSet>? DeserializeDrafts(string? payload)
    {
        if (JsonNode.Parse(payload ?? "null") is not JsonArray drafts) return null;
        DropTaskCards(drafts);
        return drafts.Deserialize<ProposalSet[]>(Options);
    }

    // Task cards from the retired single-card flow were stored with isReviewList: false; review lists
    // written before the flag was removed carry true, and newer ones omit it.
    private static void DropTaskCards(JsonArray drafts)
    {
        for (var index = drafts.Count - 1; index >= 0; index--)
            if (drafts[index]?["isReviewList"]?.GetValue<bool>() == false) drafts.RemoveAt(index);
    }
}
