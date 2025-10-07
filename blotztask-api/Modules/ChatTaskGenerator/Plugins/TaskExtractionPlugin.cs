using System.ComponentModel;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.ChatTaskGenerator.Plugins;

public class TaskExtractionPlugin
{
    [KernelFunction]
    [Description("Extract actionable tasks from user text and return them as structured task objects.")]
    public string ExtractTasksFromText(
        [Description(
            "User input text that may contain one or more actionable tasks. If the text is in Mandarin, return the tasks in Chinese.")]
        string input)
    {
        // You can implement mock logic here or leave it empty if it's only a prompt function.
        return """
               {
                 "tasks": [
                   {
                     "title": "",
                     "description": "",
                     "start_time": "",
                     "end_time": ""
                   }
                 ],
                 "isSuccess": true,
                 "errorMessage": ""
               }
               """;
    }
}