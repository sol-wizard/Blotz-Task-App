import { AddTaskItemDTO } from "../models/add-task-item-dto";
import TaskFormField from "../models/task-form-schema";

export function toAddTaskItemDTO(form: TaskFormField): AddTaskItemDTO {
  const start = form.startDate
    ? applyDefaultTimeToDate(form.startDate, form.startTime, 0, 0)
    : undefined;
  let timeType = 0;
  const end = form.endDate ? applyDefaultTimeToDate(form.endDate, form.endTime, 23, 59) : undefined;
  if (start && end) {
    timeType = 1;
  }
  return {
    title: (form.title ?? "").trim(),
    description: (form.description ?? "").trim(),
    startTime: start,
    endTime: end,
    timeType: timeType,
    labelId: form.labelId,
  };
}

// This is for backup when the date is selected but time is unselected
// Set starttime to 00:00 and endtime to 23:59
export function applyDefaultTimeToDate(
  date: Date,
  time: Date | undefined,
  defaultHours: 23 | 0,
  defaultMinutes: 59 | 0,
): Date {
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  } else {
    merged.setHours(defaultHours, defaultMinutes, 0, 0);
  }
  return merged;
}
