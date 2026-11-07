using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

/// <summary>
/// The tool definitions of one model request. Traces store them once in <c>AiCoachToolSet</c> and refer to them
/// by <see cref="Hash"/>, because the same few definition lists made up about half of every model_request payload.
/// </summary>
public sealed record TraceToolSet(string Hash, string DefinitionsJson)
{
    /// <summary>Trace kind that saves the definitions instead of writing a trace event.</summary>
    public const string Kind = "tool_set";

    // Serialized the same way model_request traces stored their Tools field before this change.
    public static TraceToolSet? From(IReadOnlyList<GatewayToolDefinition> tools)
    {
        if (tools.Count == 0) return null;
        var json = JsonSerializer.Serialize(tools);
        return new(Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(json))), json);
    }
}
