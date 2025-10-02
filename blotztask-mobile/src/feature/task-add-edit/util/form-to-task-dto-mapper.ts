import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { TaskFormField } from "../models/task-form-schema";
import { mapFormToDtoTimeType, TaskTimeType } from "./time-type-mapper";

export function mapFormToAddTaskItemDTO(form: TaskFormField): AddTaskItemDTO {
  const taskTimeType = mapFormToDtoTimeType(form.timeType ?? undefined);

  const { start, end } = getStartEndDates(
    taskTimeType,
    form.singleDate ?? undefined,
    form.singleTime ?? undefined,
    form.startDate ?? undefined,
    form.startTime ?? undefined,
    form.endDate ?? undefined,
    form.endTime ?? undefined,
  );

  return {
    title: form.title.trim(),
    description: (form.description ?? "").trim(),
    startTime: start,
    endTime: end,
    timeType: taskTimeType,
    labelId: form.labelId ?? undefined,
  };
}

// This is for backup when the date is selected but time is unselected
// Set starttime to 00:00 and endtime to 23:59
const mergeDateTime = (date: Date, time: Date | undefined): Date => {
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return merged;
};

// Calculates the start and end Date objects for a task based on its time type and form input.
function getStartEndDates(
  timeType: TaskTimeType | undefined,
  singleDate: Date | undefined,
  singleTime: Date | undefined,
  startDate: Date | undefined,
  startTime: Date | undefined,
  endDate: Date | undefined,
  endTime: Date | undefined,
): { start?: Date; end?: Date } {
  if (timeType === TaskTimeType.Single) {
    const start = singleDate ? mergeDateTime(singleDate, singleTime) : undefined;
    return { start, end: start };
  }
  if (timeType === TaskTimeType.Range) {
    const start = startDate ? mergeDateTime(startDate, startTime) : undefined;
    const end = endDate ? mergeDateTime(endDate, endTime) : undefined;
    return { start, end };
  }
  return { start: undefined, end: undefined };
}
