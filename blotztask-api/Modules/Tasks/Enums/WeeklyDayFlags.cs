namespace BlotzTask.Modules.Tasks.Enums;

[Flags]
public enum WeeklyDayFlags
{
    None = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 4,
    Thursday = 8,
    Friday = 16,
    Saturday = 32,
    Sunday = 64,
}
