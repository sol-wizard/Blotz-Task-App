import { AddTaskItemDTO } from "../models/add-task-item-dto";
import { TaskFormField } from "../models/task-form-schema";

export function toAddTaskItemDTO(form: TaskFormField): AddTaskItemDTO {
  const start = form.startDate ? mergeDateTime(form.startDate, form.startTime) : undefined;
  const end = form.endDate ? mergeDateTime(form.endDate, form.endTime) : undefined;

  return {
    title: form.title.trim(),
    description: (form.description ?? "").trim(),
    startTime: start,
    endTime: form.timeType === "single" ? start : end, // For single time tasks, starttime = endtime
    timeType: form.timeType,
    labelId: form.labelId,
  };
}

// This is for backup when the date is selected but time is unselected
// Set starttime to 00:00 and endtime to 23:59
export const mergeDateTime = (date: Date, time: Date | undefined): Date => {
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return merged;
};
