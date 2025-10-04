using System.ComponentModel;
using BlotzTask.Modules.DailyReminderGenerator.Dtos;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.DailyReminderGenerator.Plugins;

public class ReminderGenerationPlugin
{
    [KernelFunction]
    [Description(
        "Selects the single most important task from a list of today's tasks and generates a short, friendly reminding message."
    )]
    public ReminderResult GenerateReminder(
        [Description("The JSON array of today's tasks with Id, Title, Description, StartTime, EndTime, TimeType")]
        string tasksJson
    )
    {
        return new ReminderResult();
    }
}