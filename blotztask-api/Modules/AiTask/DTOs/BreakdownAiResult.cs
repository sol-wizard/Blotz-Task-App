using System.Text.Json.Serialization;

namespace BlotzTask.Modules.AiTask.DTOs;

public class AiBreakdownResult
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = default!;

    [JsonPropertyName("subtasks")]
    public List<AiBreakdownSubtask>? Subtasks { get; set; }
}

public class AiBreakdownSubtask
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = default!;

    [JsonPropertyName("description")]
    public string Description { get; set; } = default!;

    public DateTimeOffset DueDate { get; set; }
    public bool HasTime { get; set; }
}
