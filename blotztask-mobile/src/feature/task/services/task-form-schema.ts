import z from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

const taskCreationSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
  description: z
    .string()
    .max(1000, "Max 1000 chars")
    .optional()
    .or(z.literal("")),
  endTime: z
    .date()
    .optional()
    .nullable()
    .refine((d) => !d || d.getTime() > Date.now(), {
      message: "Please pick a future time",
    }),
  repeat: RepeatEnum.optional(),
  labelId: z.number().optional().nullable(),
});

export default taskCreationSchema;
