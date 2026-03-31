import { z } from "zod";
import { combineDateTime } from "../util/combine-date-time";
import { isBefore, isEqual } from "date-fns";

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(80, "Max 80 chars"),
    description: z.union([z.string().max(1000, "Max 1000 chars"), z.literal("")]).nullable(),
    startDate: z.date(),
    startTime: z.date(),
    endDate: z.date(),
    endTime: z.date(),
    labelId: z.number().nullable(),
    alert: z.number().nullable(),
    isDeadline: z.boolean(),
    deadlineDate: z.date(),
    deadlineTime: z.date(),
  })
  .refine(
    (data) => {
      const start = combineDateTime(data.startDate, data.startTime);
      const end = combineDateTime(data.endDate, data.endTime);
      if (!start || !end) return false;

      return isBefore(start, end) || isEqual(start, end);
    },
    {
      message: "form.invalidTimeRange",
      path: ["endTime"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export function hasDeadlineWarning(data: TaskFormField, isReminder: boolean): boolean {
  if (!data.isDeadline) return false;

  const endDate = isReminder ? data.startDate : data.endDate;
  const endTime = isReminder ? data.startTime : data.endTime;
  const end = combineDateTime(endDate, endTime);
  const deadline = combineDateTime(data.deadlineDate, data.deadlineTime);
  if (!end || !deadline) return false;

  return end > deadline;
}

export default TaskFormField;
