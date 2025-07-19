using System.Text.Json.Serialization;

namespace BlotzTask.Modules.AiTask.DTOs;

public class BreakdownAiResult
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = default!;

    [JsonPropertyName("subtasks")]
    public List<BreakdownAiSubtask>? Subtasks { get; set; }
}

public class BreakdownAiSubtask
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = default!;

    [JsonPropertyName("description")]
    public string Description { get; set; } = default!;

    [JsonPropertyName("label")]
    public string Label { get; set; } = default!;
}
