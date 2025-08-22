using System.ComponentModel;
using BlotzTask.Shared.DTOs;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.Chat.Plugins;

public class TaskExtractionPlugin
{
    // The KernelFunctionFromPrompt annotation tells Semantic Kernel that this method can be used as a tool.
    // The Description attribute provides a clear description of what the function does, which helps the AI.
    [
        KernelFunction,
        Description(
            "Extracts actionable tasks from the given text and returns them as a list of tasks with title, optional description, and optional end time."
        )
    ]
    public List<ExtractedTask> ExtractTasks(
        [Description("The text from which to extract tasks.")] string textToProcess
    )
    {
        return new List<ExtractedTask>();
    }
}
