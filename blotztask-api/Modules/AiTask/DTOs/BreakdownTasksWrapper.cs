
using System.Text.Json.Serialization;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.AiTask.DTOs;

public class BreakdownTasksWrapper
{
     [JsonPropertyName("subtasks")]
    public List<SubTaskWrapper> Subtasks { get; set; } = new();

}