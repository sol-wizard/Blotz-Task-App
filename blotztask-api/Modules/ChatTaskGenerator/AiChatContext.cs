using Microsoft.Agents.AI;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using BlotzTask.Modules.ChatTaskGenerator.Functions;

namespace BlotzTask.Modules.ChatTaskGenerator;

public class AiChatContext
{
    public required AIAgent Agent { get; init; }
    public required AgentSession Session { get; init; }
    public required TaskGenerationTools Tools { get; init; }
    public required List<ExtractedTask> CollectedTasks { get; init; }
    public required List<ExtractedNote> CollectedNotes { get; init; }
}
