import { z } from "zod";

export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
  description: z.union([z.string().max(1000, "Max 1000 chars"), z.literal("")]).nullable(),
  startDate: z.date().nullable(),
  startTime: z.date().nullable(),
  endDate: z.date().nullable(),
  endTime: z.date().nullable(),
  labelId: z.number().nullable(),
});

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
