import { z } from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

export const editTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120, "Max 120 characters."),
  description: z.string().trim().max(2000, "Max 2000 characters.").default(""),
  repeat: RepeatEnum.optional(),
  endTime: z.string().optional(),
  labelId: z.preprocess((val) => Number(val ?? 0), z.number()),
});
export type EditTaskFormField = z.infer<typeof editTaskSchema>;
