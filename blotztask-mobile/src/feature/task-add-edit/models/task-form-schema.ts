import { z } from "zod";
import { isMultiDay } from "../util/date-time-helpers";

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
      if (data.startDate && data.startTime && data.endDate && data.endTime) {
        const start = new Date(
          new Date(data.startDate).setHours(
            data.startTime.getHours(),
            data.startTime.getMinutes(),
            0,
            0,
          ),
        );
        const end = new Date(
          new Date(data.endDate).setHours(data.endTime.getHours(), data.endTime.getMinutes(), 0, 0),
        );
        return end.getTime() >= start.getTime();
      }
      return true;
    },
    {
      message: "End time cannot be earlier than start time",
      path: ["endTime"],
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate && !isMultiDay(data.startDate, data.endDate)) {
        return data.startTime !== null && data.endTime !== null;
      }
      return true;
    },
    {
      message: "Time is required when start and end dates are the same",
      path: ["startTime"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
