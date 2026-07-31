import { z } from "zod";
import { combineDateTime } from "../util/combine-date-time";
import { isAfter, isBefore, isEqual, startOfDay } from "date-fns";

export const recurrenceValues = [
  "never",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
  "custom",
] as const;

export const recurrenceEndModeValues = ["never", "onDate"] as const;

const MAX_RECURRING_EVENT_DURATION_DAYS = 31;
const MAX_RECURRING_EVENT_DURATION_MS = MAX_RECURRING_EVENT_DURATION_DAYS * 24 * 60 * 60 * 1000;

const taskFormShape = z.object({
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
  recurrence: z.enum(recurrenceValues),
  recurrenceEndMode: z.enum(recurrenceEndModeValues),
  recurrenceEndDate: z.date().nullable(),
  isDeadline: z.boolean(),
  deadlineDate: z.date().nullable(),
  deadlineTime: z.date().nullable(),
});

export const taskFormSchema = taskFormShape
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
  )
  .refine(
    (data) => {
      if (data.recurrence === "never" || data.recurrence === "custom") return true;

      const start = combineDateTime(data.startDate, data.startTime);
      const end = combineDateTime(data.endDate, data.endTime);
      if (!start || !end) return false;

      return end.getTime() - start.getTime() <= MAX_RECURRING_EVENT_DURATION_MS;
    },
    {
      message: "recurrence.durationTooLong",
      path: ["endTime"],
    },
  )
  .refine(
    (data) => {
      if (data.recurrence === "never" || data.recurrence === "custom") return true;
      if (data.recurrenceEndMode === "never") return true;

      return data.recurrenceEndDate != null;
    },
    {
      message: "recurrence.endDateRequired",
      path: ["recurrenceEndDate"],
    },
  )
  .refine(
    (data) => {
      if (data.recurrence === "never" || data.recurrence === "custom") return true;
      if (data.recurrenceEndMode === "never" || !data.recurrenceEndDate) return true;

      const firstRepeatDate = startOfDay(data.startDate);
      const recurrenceEndDate = startOfDay(data.recurrenceEndDate);

      return (
        isBefore(firstRepeatDate, recurrenceEndDate) || isEqual(firstRepeatDate, recurrenceEndDate)
      );
    },
    {
      message: "recurrence.endDateBeforeStart",
      path: ["recurrenceEndDate"],
    },
  )
  .refine((data) => !hasDeadlineConflict(data), {
    message: "form.invalidDeadlineRange",
    path: ["deadlineTime"],
  });

export type TaskFormField = z.infer<typeof taskFormSchema>;

export type TimeFormValues = Pick<TaskFormField, "startDate" | "startTime" | "endDate" | "endTime">;

export type DeadlineConflictValues = Pick<
  z.infer<typeof taskFormShape>,
  "isDeadline" | "endDate" | "endTime" | "deadlineDate" | "deadlineTime"
>;

export function hasDeadlineConflict(data: DeadlineConflictValues): boolean {
  if (!data.isDeadline) return false;

  const end = combineDateTime(data.endDate, data.endTime);
  const deadline = combineDateTime(data.deadlineDate, data.deadlineTime);
  // Deadline not picked yet — nothing to compare against.
  if (!end || !deadline) return false;

  return isAfter(end, deadline);
}

export default TaskFormField;
