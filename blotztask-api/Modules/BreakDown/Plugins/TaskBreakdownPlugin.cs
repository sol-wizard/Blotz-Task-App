using System.ComponentModel;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.BreakDown.Plugins;

public class TaskBreakdownPlugin
{
    [
        KernelFunction,
        Description(
            "Break down a task into multiple subtasks with duration."
        )
    ]
    public List<SubTaskWrapper> BreakdownTask(string taskJson)
    {
        return new List<SubTaskWrapper>();
    }
}