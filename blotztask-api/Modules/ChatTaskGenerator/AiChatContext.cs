using Microsoft.Agents.AI;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;

namespace BlotzTask.Modules.ChatTaskGenerator;

//TODO: Why is this file here? should this be a DTOs?
public class AiChatContext
{
    public required AIAgent Agent { get; init; }
    public required AgentSession Session { get; init; }
    public required TaskGenerationTools Tools { get; init; }
    public required List<ExtractedTask> Tasks { get; init; }
    public required List<ExtractedNote> Notes { get; init; }
    public required TimeZoneInfo TimeZone { get; init; }
}
