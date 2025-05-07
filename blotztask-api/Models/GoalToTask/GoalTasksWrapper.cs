using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BlotzTask.Models.GoalToTask
{
    public class GoalTasksWrapper
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("tasks")]
        public List<ExtractedTask> Tasks { get; set; } = new List<ExtractedTask>();

        [JsonPropertyName("confidenceScore")]
        public double ConfidenceScore { get; set; }  
    }
}
