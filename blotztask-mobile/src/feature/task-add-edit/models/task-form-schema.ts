import { z } from "zod";
import { combineDateTime } from "../util/combine-date-time";
import { isBefore, isEqual } from "date-fns";

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "details.mustHaveTitleError")
      .max(80, "details.titleTooLongError"),
    description: z.union([z.string().max(1000, "Max 1000 chars"), z.literal("")]).nullable(),
    startDate: z.date(),
    startTime: z.date(),
    endDate: z.date(),
    endTime: z.date(),
    labelId: z.number().nullable(),
    alert: z.number().nullable(),
    isDeadline: z.boolean(),
    deadlineDate: z.date().nullable(),
    deadlineTime: z.date().nullable(),
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

export function hasDeadlineWarning(data: TaskFormField): boolean {
  if (!data.isDeadline) return false;

  const endDate = data.endDate;
  const endTime = data.endTime;
  const end = combineDateTime(endDate, endTime);
  const deadline = combineDateTime(data.deadlineDate, data.deadlineTime);
  if (!end || !deadline) return false;

  return end > deadline;
}

export default TaskFormField;
