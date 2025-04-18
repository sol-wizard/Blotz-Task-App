using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BlotzTask.Models
{
    public class ExtractedTasksWrapper
    {
        [JsonPropertyName("tasks")]
        public List<ExtractedTask> Tasks { get; set; } = new List<ExtractedTask>();
    }
}
