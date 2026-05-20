using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Users.Enums;

namespace BlotzTask.Modules.Users.Services;

public static class DefaultOnboardingSeedFactory
{
    public static List<TaskItem> BuildTasks(
        Guid userId,
        DateTime utcNow,
        DateTimeOffset utcNowWithOffset,
        Language language)
    {
        var singleTime = utcNowWithOffset;
        var rangeStart = utcNowWithOffset;
        var rangeEnd = utcNowWithOffset.AddHours(2);

        if (language == Language.Zh)
        {
            return new List<TaskItem>
            {
                new()
                {
                    Title = "欢迎使用 Blotz！",
                    Description = "这是一个单点时间任务示例",
                    StartTime = singleTime,
                    EndTime = singleTime,
                    TimeType = TaskTimeType.SingleTime,
                    UserId = userId,
                    IsDone = false,
                    LabelId = 7,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new()
                {
                    Title = "探索应用功能",
                    Description = "这是一个时间段任务示例",
                    StartTime = rangeStart,
                    EndTime = rangeEnd,
                    TimeType = TaskTimeType.RangeTime,
                    UserId = userId,
                    IsDone = false,
                    LabelId = 8,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                }
            };
        }

        return new List<TaskItem>
        {
            new()
            {
                Title = "Welcome to Blotz!",
                Description = "This is a single-time task example",
                StartTime = singleTime,
                EndTime = singleTime,
                TimeType = TaskTimeType.SingleTime,
                UserId = userId,
                IsDone = false,
                LabelId = 7,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            },
            new()
            {
                Title = "Explore the app",
                Description = "This is a range-time task example",
                StartTime = rangeStart,
                EndTime = rangeEnd,
                TimeType = TaskTimeType.RangeTime,
                UserId = userId,
                IsDone = false,
                LabelId = 8,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            }
        };
    }

    public static List<Note> BuildNotes(Guid userId, DateTime utcNow, Language language)
    {
        var noteTexts = language == Language.Zh
            ? new[]
            {
                "欢迎使用 BlotzTask！这是你的第一条笔记。",
                "你可以用笔记快速记录想法和灵感。",
                "笔记适合记录那些暂时不需要截止日期的事情。",
                "试着创建一条属于你的笔记吧！"
            }
            : new[]
            {
                "Welcome to BlotzTask! This is your first note.",
                "You can use notes to capture quick thoughts and ideas.",
                "Notes are perfect for things that don't need a due date.",
                "Try creating your own note!"
            };

        return noteTexts
            .Select(text => new Note
            {
                Text = text,
                UserId = userId,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            })
            .ToList();
    }
}