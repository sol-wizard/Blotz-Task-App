using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Users.Enums;

namespace BlotzTask.Modules.Users.Services;

public static class DefaultOnboardingData
{
    public static List<TaskItem> BuildTasks(
        Guid userId,
        DateTimeOffset utcNowWithOffset,
        Language language)
    {
        var utcNow = DateTime.UtcNow;
        var singleTime = utcNowWithOffset;
        var rangeStart = utcNowWithOffset;
        var rangeEnd = utcNowWithOffset.AddHours(2); // Example Range Task Duration

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

    public static List<Note> BuildNotes(Guid userId, Language language)
    {
        var utcNow = DateTime.UtcNow;

        if (language == Language.Zh)
        {
            return new List<Note>
            {
                new Note
                {
                    Text = "欢迎使用 BlotzTask！这是你的第一条笔记。",
                    UserId = userId,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new Note
                {
                    Text = "你可以用笔记快速记录想法和灵感。",
                    UserId = userId,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new Note
                {
                    Text = "笔记适合记录那些暂时不需要截止日期的事情。",
                    UserId = userId,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                },
                new Note
                {
                    Text = "试着创建一条属于你的笔记吧！",
                    UserId = userId,
                    CreatedAt = utcNow,
                    UpdatedAt = utcNow
                }
            };
        }

        return new List<Note>
        {
            new Note
            {
                Text = "Welcome to BlotzTask! This is your first note.",
                UserId = userId,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            },
            new Note
            {
                Text = "You can use notes to capture quick thoughts and ideas.",
                UserId = userId,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            },
            new Note
            {
                Text = "Notes are perfect for things that don't need a due date.",
                UserId = userId,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            },
            new Note
            {
                Text = "Try creating your own note!",
                UserId = userId,
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            }
        };
    }
}