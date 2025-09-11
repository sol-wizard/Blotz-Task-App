import z from "zod";
export const taskEditFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Max 80 chars"),
});

type EditTaskFormField = z.infer<typeof taskEditFormSchema>;
export default EditTaskFormField;
