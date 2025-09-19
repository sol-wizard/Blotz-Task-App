import z from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

export const taskFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
    description: z.string().max(1000, "Max 1000 chars").optional().or(z.literal("")).optional(),
    startDate: z.date().optional(),
    startTime: z.date().optional(),
    endDate: z.date().optional(),
    endTime: z.date().optional(),
    repeat: RepeatEnum.optional(),
    labelId: z.number(),
  })
  .refine(
    (data) => {
      // If either side is partially filled, skip this check; let submit logic handle requiredness
      const hasStart = !!data.startDate && !!data.startTime;
      const hasEnd = !!data.endDate && !!data.endTime;
      if (!hasStart || !hasEnd) return true;

      const start = new Date(
        new Date(data.startDate as Date).setHours(
          (data.startTime as Date).getHours(),
          (data.startTime as Date).getMinutes(),
          0,
          0,
        ),
      );
      const end = new Date(
        new Date(data.endDate as Date).setHours(
          (data.endTime as Date).getHours(),
          (data.endTime as Date).getMinutes(),
          0,
          0,
        ),
      );

      return end.getTime() >= start.getTime();
    },
    {
      message: "End time cannot be earlier than start time",
      path: ["endTime"],
    },
  );

export type TaskFormField = z.infer<typeof taskFormSchema>;

export default TaskFormField;
