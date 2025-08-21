using System.ComponentModel;
using BlotzTask.Shared.DTOs;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.Chat.Plugins;

public class TaskExtractionPlugin
{
    // The KernelFunctionFromPrompt annotation tells Semantic Kernel that this method can be used as a tool.
    // The Description attribute provides a clear description of what the function does, which helps the AI.
    [KernelFunction, Description("Extracts tasks and their details from a given text.")]
    public ExtractedTaskResponse ExtractTasks(
        [Description("The text from which to extract tasks.")] string textToProcess)
    {
        // This method will not actually be executed by your C# code in the "tool-calling" scenario.
        // Instead, the AI will understand its signature and return type
        // and generate JSON that conforms to ExtractedTaskResponse.
        // We provide a dummy implementation here just for compilation purposes.
        return new ExtractedTaskResponse();
    }
} 