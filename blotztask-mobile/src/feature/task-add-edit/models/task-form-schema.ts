import { z } from "zod";

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
    },
    {
      message: "End time cannot be earlier than start time",
      path: ["endTime"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
