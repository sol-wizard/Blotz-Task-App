import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { TaskDetailDTO } from "@/model/task-detail-dto";
import { Control, FieldErrors } from "react-hook-form";
import { z } from "zod";
import { taskFormSchema } from "../../shared/forms/task-form-schema";

type ChatTaskCardDescriptionBlockProps = {
  task: TaskDetailDTO;
  isEditing: boolean;
  control: Control<z.infer<typeof taskFormSchema>>;
  errors: FieldErrors<z.infer<typeof taskFormSchema>>;
};

export const ChatTaskCardDescriptionBlock = ({ task,  isEditing, control, errors }: ChatTaskCardDescriptionBlockProps) => {
  return (
  <div className="flex flex-col w-full">
    {isEditing ? (
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea className="w-full" placeholder={task.description} {...field} />
            </FormControl>
            <FormMessage>{errors.description?.message}</FormMessage>
          </FormItem>
        )}
      />
    ) : (
      <p className='break-words text-sm'>{task.description}</p>
    )}
  </div>
);}
  