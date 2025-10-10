import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { TaskFormField } from "../models/task-form-schema";
import { isSameMinute } from "date-fns";
import { TaskTimeType } from "@/shared/models/task-detail-dto";
import { isMultiDay } from "./date-time-helpers";

export function mapFormToAddTaskItemDTO(form: TaskFormField): AddTaskItemDTO {
  const { startDate, startTime, endDate, endTime } = form;

  const start = startDate != null ? mergeDateTime(startDate, startTime ?? undefined) : undefined;
  const end = endDate != null ? mergeDateTime(endDate, endTime ?? undefined) : undefined;

  const taskTimeType = getTimeType(start, end);

  if (taskTimeType === TaskTimeType.Range && isMultiDay(startDate, endDate)) {
    start?.setHours(0, 0, 0, 0);
    end?.setHours(23, 59, 0, 0);
  }

  return {
    title: form.title.trim(),
    description: form.description?.trim() ?? "",
    startTime: taskTimeType === TaskTimeType.Single ? start : start,
    endTime: taskTimeType === TaskTimeType.Single ? start : end,
    timeType: taskTimeType,
    labelId: form.labelId ?? undefined,
  };
}

function mergeDateTime(date: Date, time?: Date): Date {
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return merged;
}

function getTimeType(start?: Date, end?: Date): TaskTimeType | null {
  if (!start || !end) {
    return null;
  }

  return isSameMinute(start, end) ? TaskTimeType.Single : TaskTimeType.Range;
}
