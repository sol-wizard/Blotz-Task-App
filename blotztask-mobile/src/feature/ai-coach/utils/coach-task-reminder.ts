import { fromZonedTime } from "date-fns-tz";
import { calculateAlertTime } from "@/feature/task-add-edit/util/time-convertion";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { getTaskNotification } from "@/shared/util/get-task-notification";
import { TaskDraftItemDto, TaskReminderDto } from "../models/ai-coach-dto";

// The task form's default and the AI sheet's: 5 minutes before the start.
const DEFAULT_ALERT_SECONDS = 300;

/**
 * Schedules the phone reminder for a one-off task card the user is adding, the same way the task form does, so it
 * can be stored on the saved task. Null for notes, repeating tasks, cards without a time, reminders switched off
 * in Settings, or an alert time already past.
 */
export async function scheduleCoachTaskReminder(
  item: TaskDraftItemDto,
  upcomingNotification: boolean | undefined,
): Promise<TaskReminderDto | null> {
  if (item.kind !== "task" || item.recurrence || !item.date || !item.startTime) return null;
  const start = fromZonedTime(`${item.date}T${item.startTime}:00`, item.timeZoneId);
  const alertTime = calculateAlertTime(start, DEFAULT_ALERT_SECONDS);
  const notificationId = await getTaskNotification({
    mode: "create",
    upcomingNotification,
    newAlertTime: alertTime,
    newTaskTitle: item.title,
  });
  return notificationId && alertTime
    ? { notificationId, alertTime: convertToDateTimeOffset(alertTime) }
    : null;
}
