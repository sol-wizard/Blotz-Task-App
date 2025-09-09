import z from "zod";

const RepeatEnum = z.enum(["none", "daily", "weekly", "monthly"]);

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> b91d27e (Bugs fix before launch (#481))
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
<<<<<<< HEAD

export type TaskFormField = z.infer<typeof taskFormSchema>;
=======
//move schema out from services and put in to model folder
export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
  description: z.string().max(1000, "Max 1000 chars").optional().or(z.literal("")).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  repeat: RepeatEnum.optional(),
  labelId: z.number(),
});

type TaskFormField = z.infer<typeof taskFormSchema>;
>>>>>>> c05ce2d (Unify code style (#462))
=======

export type TaskFormField = z.infer<typeof taskFormSchema>;
>>>>>>> b91d27e (Bugs fix before launch (#481))

export default TaskFormField;
