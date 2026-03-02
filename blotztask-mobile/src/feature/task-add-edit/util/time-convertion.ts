import { TaskTimeType } from "@/shared/models/task-detail-dto";
import { isSameMinute } from "date-fns";

const ALLOWED_ALERT_SECONDS = [0, 300, 600, 1800, 3600, 7200, 86400, 604800];

export function calculateAlertSeconds(startTime?: string, alertTime?: string): number | null {
  if (!startTime || !alertTime) return null;

  const start = new Date(startTime);
  const alert = new Date(alertTime);

  if (isNaN(start.getTime()) || isNaN(alert.getTime())) {
    return null;
  }
  if (alert >= start) return null;

  const diffSeconds = Math.floor((start.getTime() - alert.getTime()) / 1000);

  return (ALLOWED_ALERT_SECONDS as readonly number[]).includes(diffSeconds) ? diffSeconds : null;
}

export function calculateAlertTime(
  startTime: Date | null | undefined,
  reminderSeconds: number | null | undefined,
): Date | null {
  if (!startTime || reminderSeconds == null || !ALLOWED_ALERT_SECONDS.includes(reminderSeconds)) {
    console.log(
      "!startTime || !reminderSeconds || !ALLOWED_ALERT_SECONDS.includes(reminderSeconds)",
    );
    return null;
  }

  const alertMs = startTime.getTime() - reminderSeconds * 1000;
  return new Date(alertMs);
}

export function buildTaskTimePayload(
  startDate: Date,
  startTime: Date,
  endDate: Date,
  endTime: Date,
): { startTime: Date; endTime: Date; timeType: TaskTimeType } {
  const start = mergeDateTime(startDate, startTime);
  const end = mergeDateTime(endDate, endTime);
  const taskTimeType = getTimeType(start, end);

  return {
    startTime: start,
    endTime: taskTimeType === TaskTimeType.Single ? start : end,
    timeType: taskTimeType,
  };
}

function getTimeType(start: Date, end: Date): TaskTimeType {
  return isSameMinute(start, end) ? TaskTimeType.Single : TaskTimeType.Range;
}

function mergeDateTime(date: Date, time?: Date): Date {
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return merged;
}
