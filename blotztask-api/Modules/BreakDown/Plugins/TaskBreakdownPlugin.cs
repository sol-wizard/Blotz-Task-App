using System.ComponentModel;
using Microsoft.SemanticKernel;
using BlotzTask.Modules.BreakDown.DTOs;

namespace BlotzTask.Modules.BreakDown.Plugins;

public class TaskBreakdownPlugin
{
    [
        KernelFunction,
        Description(
            "Break down a task into multiple subtasks with duration and order."
        )
    ]
    public List<SubTaskWrapper> BreakdownTask(string taskJson)
    {
        return new List<SubTaskWrapper>();
    }
}