import { TaskTimeType } from "@/shared/models/task-detail-dto";
import { isSameMinute } from "date-fns";
import { isMultiDay } from "./date-time-helpers";

const ALLOWED_ALERT_SECONDS = [0, 300, 600, 1800, 3600, 7200, 86400];

export function calculateAlertSeconds(
  startTime: Date | null | undefined,
  alertTime: Date | null | undefined,
): number | null {
  if (!startTime || !alertTime) return null;

  const startMs = startTime.getTime();
  const alertMs = alertTime.getTime();

  if (alertMs >= startMs) return null;

  const diffSeconds = Math.floor((startMs - alertMs) / 1000);

  return (ALLOWED_ALERT_SECONDS as readonly number[]).includes(diffSeconds) ? diffSeconds : null;
}

export function calculateAlertTime(
  startTime: Date | null | undefined,
  reminderSeconds: number | null | undefined,
): Date | null {
  if (!startTime || reminderSeconds == null) return null;

  if (!ALLOWED_ALERT_SECONDS.includes(reminderSeconds)) {
    return null;
  }

  const alertMs = startTime.getTime() - reminderSeconds * 1000;
  return new Date(alertMs);
}

export function buildTaskTimePayload(
  startDate: Date | null,
  startTime: Date | null,
  endDate: Date | null,
  endTime: Date | null,
): { startTime: Date | undefined; endTime: Date | undefined; timeType: TaskTimeType | null } {
  const start = startDate != null ? mergeDateTime(startDate, startTime ?? undefined) : undefined;
  const end = endDate != null ? mergeDateTime(endDate, endTime ?? undefined) : undefined;

  const taskTimeType = getTimeType(start, end);

  // multi-day range + missing time => normalize to day bounds
  if (taskTimeType === TaskTimeType.Range && isMultiDay(startDate, endDate) && startTime === null) {
    start?.setHours(0, 0, 0, 0);
  }
  if (taskTimeType === TaskTimeType.Range && isMultiDay(startDate, endDate) && endTime === null) {
    end?.setHours(23, 59, 0, 0);
  }

  return {
    startTime: taskTimeType === TaskTimeType.Single ? start : start,
    endTime: taskTimeType === TaskTimeType.Single ? start : end,
    timeType: taskTimeType,
  };
}

function getTimeType(start?: Date, end?: Date): TaskTimeType | null {
  if (!start || !end) {
    return null;
  }

  return isSameMinute(start, end) ? TaskTimeType.Single : TaskTimeType.Range;
}

function mergeDateTime(date: Date, time?: Date): Date {
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return merged;
}
