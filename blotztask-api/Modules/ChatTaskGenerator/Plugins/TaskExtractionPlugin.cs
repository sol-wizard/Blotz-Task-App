using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.ChatTaskGenerator.Plugins;

public class TaskExtractionPlugin
{
    [KernelFunction]
    [Description("Extract actionable tasks from user text and return them as structured task objects.")]
    public AiGenerateTaskWrapper ExtractTasksFromText(
        [Description(
            "User input text that may contain one or more actionable tasks. If the text is in Mandarin, return the tasks in Chinese.")]
        string input)
    {
        // You can implement mock logic here or leave it empty if it's only a prompt function.
        return new AiGenerateTaskWrapper();
    }
}