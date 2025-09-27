using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Shared;

public static class TaskTimeValidator
{
    public static void ValidateTaskTimes(DateTimeOffset? startTime, DateTimeOffset? endTime, TaskTimeType timeType)
    {
        // StartTime cannot exist alone ¡ª either both are empty or both are provided
        if ((startTime.HasValue && !endTime.HasValue) || (!startTime.HasValue && endTime.HasValue))
        {
            throw new ArgumentException("StartTime and EndTime must both be provided or both be empty.");
        }

        // If both times are provided
        if (startTime.HasValue && endTime.HasValue)
        {
            // If TimeType is SingleTime, StartTime and EndTime must be the same
            if (timeType == TaskTimeType.SingleTime && startTime != endTime)
            {
                throw new ArgumentException("For SingleTime tasks, StartTime and EndTime must be the same.");
            }

            // StartTime must be before or equal to endTime
            if (startTime > endTime)
            {
                throw new ArgumentException("Start time must be earlier than or equal to end time.");
            }
        }
    }
}