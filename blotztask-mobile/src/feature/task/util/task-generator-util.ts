import { AddTaskItemDTO } from "../models/add-task-item-dto";
import TaskFormField from "../models/task-form-schema";

export function toAddTaskItemDTO(form: TaskFormField): AddTaskItemDTO {
  const start = form.startDate
    ? applyDefaultTimeToDate(form.startDate, form.startTimeOnly, 0, 0)
    : undefined;

  const end = form.endDate
    ? applyDefaultTimeToDate(form.endDate, form.endTimeOnly, 23, 59)
    : undefined;

  return {
    title: (form.title ?? "").trim(),
    description: (form.description ?? "").trim(),
    startTime: start,
    endTime: end,
    labelId: form.labelId,
  };
}

export function applyDefaultTimeToDate(
  datePart: Date,
  timePart: Date | undefined,
  defaultHours: number,
  defaultMinutes: number,
): Date {
  const merged = new Date(datePart);
  if (timePart) {
    merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  } else {
    merged.setHours(defaultHours, defaultMinutes, 0, 0);
  }
  return merged;
}
