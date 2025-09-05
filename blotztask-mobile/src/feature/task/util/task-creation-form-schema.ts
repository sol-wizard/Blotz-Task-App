import z from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

//move schema out from services and put in to model folder
export const taskCreationSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
  description: z
    .string()
    .max(1000, "Max 1000 chars")
    .optional()
    .or(z.literal(""))
    .optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  repeat: RepeatEnum.optional(),
  labelId: z.number(),
});

type AddTaskFormField = z.infer<typeof taskCreationSchema>;

export default AddTaskFormField;
