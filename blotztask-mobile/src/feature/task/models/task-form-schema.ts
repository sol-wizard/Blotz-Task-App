import z from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

export const taskFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
    description: z.string().max(1000, "Max 1000 chars").optional().or(z.literal("")).optional(),
    startTime: z.date().optional(),
    endTime: z.date().optional(),
    repeat: RepeatEnum.optional(),
    labelId: z.number(),
  })
  .refine(
    (data) =>
      !data.startTime || !data.endTime || data.endTime.getTime() >= data.startTime.getTime(),
    {
      message: "End time cannot be earlier than start time",
      path: ["endTime"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
