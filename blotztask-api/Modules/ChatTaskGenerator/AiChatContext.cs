using Microsoft.Agents.AI;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;

namespace BlotzTask.Modules.ChatTaskGenerator;

/// <summary>
/// Holds the live state for a single user's AI session.
/// Created once on SignalR connection and reused across all messages in that session,
/// so the AI remembers chat history and can update or remove previously created tasks.
/// This is not a DTO — it is mutable session state owned by the hub connection.
/// </summary>
public class AiChatContext
{
    /// <summary>The AI agent instance configured with the system prompt and tools for this session.</summary>
    public required AIAgent Agent { get; init; }

    /// <summary>The conversation thread that carries chat history across multiple user messages.</summary>
    public required AgentSession Session { get; init; }

    /// <summary>Tool implementations the AI can call (CreateTask, RemoveTask, etc.) and their streaming callbacks.</summary>
    public required TaskGenerationTools Tools { get; init; }

    /// <summary>Accumulates tasks created or updated by the AI during this session.</summary>
    public required List<ExtractedTask> Tasks { get; init; }

    /// <summary>Accumulates notes created by the AI during this session.</summary>
    public required List<ExtractedNote> Notes { get; init; }

}
