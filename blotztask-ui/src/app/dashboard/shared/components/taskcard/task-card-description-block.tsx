import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { TaskDetailDTO } from "@/model/task-detail-dto";
import { TaskCardStatus } from "./task-card";
import { Control, FieldErrors } from "react-hook-form";
import { z } from "zod";
import { taskFormSchema } from "../../forms/task-form-schema";
import { cn } from "@/lib/utils";

type TaskCardDescriptionBlockProps = {
  task: TaskDetailDTO;
  taskStatus?: TaskCardStatus;
  isEditing: boolean;
  control: Control<z.infer<typeof taskFormSchema>>;
  errors: FieldErrors<z.infer<typeof taskFormSchema>>;
};

export const TaskCardDescriptionBlock = ({ task, isEditing, control, errors }: TaskCardDescriptionBlockProps) => {
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
        <p className="w-[500px] break-words text-[#444964]">
          {task.description}
        </p>
      )}
    </div>
  );
};
