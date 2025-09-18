import z from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

export const taskFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
    description: z.string().max(1000, "Max 1000 chars").optional().or(z.literal("")).optional(),
    startDate: z.date().optional(),
    startTimeOnly: z.date().optional(),
    endDate: z.date().optional(),
    endTimeOnly: z.date().optional(),
    repeat: RepeatEnum.optional(),
    labelId: z.number(),
  })
  .refine(
    (data) => {
      // If either side is partially filled, skip this check; let submit logic handle requiredness
      const hasStart = !!data.startDate && !!data.startTimeOnly;
      const hasEnd = !!data.endDate && !!data.endTimeOnly;
      if (!hasStart || !hasEnd) return true;

      const start = new Date(
        new Date(data.startDate as Date).setHours(
          (data.startTimeOnly as Date).getHours(),
          (data.startTimeOnly as Date).getMinutes(),
          0,
          0,
        ),
      );
      const end = new Date(
        new Date(data.endDate as Date).setHours(
          (data.endTimeOnly as Date).getHours(),
          (data.endTimeOnly as Date).getMinutes(),
          0,
          0,
        ),
      );

      return end.getTime() >= start.getTime();
    },
    {
      message: "End time cannot be earlier than start time",
      path: ["endTimeOnly"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
