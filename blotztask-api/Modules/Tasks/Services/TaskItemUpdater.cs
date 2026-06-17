using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Shared;

namespace BlotzTask.Modules.Tasks.Services;

public class TaskItemUpdater(BlotzTaskDbContext db)
{
    public void Apply(TaskItem task, EditTaskItemDto taskDetails)
    {
        TaskTimeValidator.ValidateTaskTimes(taskDetails.StartTime, taskDetails.EndTime, taskDetails.TimeType);

        var newTitle = (taskDetails.Title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(newTitle))
        {
            throw new ValidationException("Title is required.");
        }

        task.Title = newTitle;
        task.Description = taskDetails.Description;
        task.StartTime = taskDetails.StartTime;
        task.EndTime = taskDetails.EndTime;
        task.TimeType = taskDetails.TimeType;
        task.NotificationId = taskDetails.NotificationId;
        task.AlertTime = taskDetails.AlertTime;
        task.UpdatedAt = DateTime.UtcNow;
        task.LabelId = taskDetails.LabelId;

        switch (taskDetails.IsDeadline)
        {
            case true:
                if (task.Deadline is null)
                {
                    task.Deadline = new TaskDeadline
                    {
                        TaskItem = task,
                        DueAt = taskDetails.DueAt ?? task.EndTime,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsPinned = false
                    };
                }
                else
                {
                    task.Deadline.DueAt = taskDetails.DueAt ?? task.EndTime;
                    task.Deadline.UpdatedAt = DateTime.UtcNow;
                }
                break;

            case false when task.Deadline is not null:
                db.Remove(task.Deadline);
                break;

            case null:
                break;
        }
    }
}
