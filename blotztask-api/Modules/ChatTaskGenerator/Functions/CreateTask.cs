using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.ChatTaskGenerator.Functions;

public class CreateTask(ILogger<CreateTask> logger)
{
    public List<ExtractedTask> CollectedTasks { get; } = new();

    [KernelFunction]
    [Description("Creates a task extracted from user input. Call this for any item that has a specific date or time associated with it.")]
    public void Create(
        [Description("A short, descriptive name for the task")] string title,
        [Description("A detailed description of the task. Leave empty if no clear description is provided.")] string description,
        [Description("The start time for the task as a local time in the format yyyy-MM-ddTHH:mm:ss. For single-time tasks, this should equal endTime.")] DateTime startTime,
        [Description("The end time for the task as a local time in the format yyyy-MM-ddTHH:mm:ss. For single-time tasks, this should equal startTime. For range tasks, this must be greater than startTime.")] DateTime endTime,
        [Description("The label for the task. Must be one of: Work, Life, Learning, Health")] LabelNameEnum labelName)
    {
        logger.LogInformation("FunctionCall: CreateTask called with Title={Title}, StartTime={StartTime}, EndTime={EndTime}, Label={Label}",
            title, startTime, endTime, labelName);

        CollectedTasks.Add(new ExtractedTask
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            StartTime = startTime,
            EndTime = endTime,
            LabelName = labelName
        });
    }
}
