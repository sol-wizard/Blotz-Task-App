using Microsoft.Agents.AI;
using BlotzTask.Modules.ChatTaskGenerator.FunctionTools;

namespace BlotzTask.Modules.ChatTaskGenerator;

//TODO: Why is this file here? should this be a DTOs?
public class AiChatContext
{
    public required AIAgent Agent { get; init; }
    public required AgentSession Session { get; init; }
    public required TaskGenerationTools Tools { get; init; }
    public required TimeZoneInfo TimeZone { get; init; }
}
