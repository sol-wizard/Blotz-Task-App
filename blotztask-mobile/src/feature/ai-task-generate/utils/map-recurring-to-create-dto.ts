import { AiRecurringTaskDTO } from "../models/ai-recurring-task-dto";
import { RecurringTaskCreateDTO } from "@/shared/models/recurring-task-create-dto";
import { TaskTimeType } from "@/shared/models/base-task-dto";

// SPIKE (#1462, throwaway): AI recurring draft -> RecurringTaskCreateDTO (POST /api/RecurringTask).
// Mirrors the manual flow's mapTaskToRecurringTask: device timezone for scheduleTimeZoneId,
// templateEndTime null for SingleTime, and the rich daysOfWeek/interval/dayOfMonth passed straight
// through (unlike the manual UI, which derives a single day from the start date).
export function mapRecurringToCreateDTO(task: AiRecurringTaskDTO): RecurringTaskCreateDTO {
  const scheduleTimeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    title: task.title,
    description: task.description || undefined,
    timeType: task.timeType,
    labelId: task.label?.labelId,
    templateStartTime: task.templateStartTime,
    templateEndTime: task.timeType === TaskTimeType.Single ? null : task.templateEndTime,
    scheduleTimeZoneId,
    frequency: task.frequency,
    interval: task.interval,
    daysOfWeek: task.daysOfWeek ?? null,
    dayOfMonth: task.dayOfMonth ?? null,
    startDate: task.startDate,
    endDate: task.endDate ?? null,
    isDeadline: false,
    templateDueAt: null,
    deadlineTimeZoneId: null,
  };
}
