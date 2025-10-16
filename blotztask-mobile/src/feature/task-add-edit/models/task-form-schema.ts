import { z } from "zod";
import { combineDateTime } from "../util/combine-date-time";
import { isBefore, isEqual } from "date-fns";

export const taskFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
    description: z.union([z.string().max(1000, "Max 1000 chars"), z.literal("")]).nullable(),
    startDate: z.date().nullable(),
    startTime: z.date().nullable(),
    endDate: z.date().nullable(),
    endTime: z.date().nullable(),
    labelId: z.number().nullable(),
  })
  .refine(
    (data) => {
      const start = combineDateTime(data.startDate, data.startTime);
      const end = combineDateTime(data.endDate, data.endTime);
      if (!start || !end) return true;

      return isBefore(start, end) || isEqual(start, end);
    },
    {
      message: "Start time cannot be later than end time",
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
