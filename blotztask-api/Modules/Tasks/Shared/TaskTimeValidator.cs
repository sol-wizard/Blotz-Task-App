using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.Tasks.Shared;

public static class TaskTimeValidator
{
    public static void ValidateTaskTimes(DateTimeOffset? startTime, DateTimeOffset? endTime, TaskTimeType? timeType)
    {
        if (timeType == null)
        {
            if (startTime.HasValue || endTime.HasValue)
                throw new ArgumentException(
                    "For tasks without TimeType, StartTime and EndTime must both be empty.");

            return;
        }

        if (!startTime.HasValue || !endTime.HasValue)
            throw new ArgumentException(
                "For tasks with TimeType, both StartTime and EndTime must be provided.");

        if (timeType == TaskTimeType.SingleTime && startTime != endTime)
            throw new ArgumentException(
                "For SingleTime tasks, StartTime and EndTime must be the same.");

        if (startTime > endTime)
            throw new ArgumentException(
                "StartTime must be earlier than or equal to EndTime.");
    }
}