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

export const TaskCardDescriptionBlock = ({ task, taskStatus='todo',  isEditing, control, errors }: TaskCardDescriptionBlockProps) => {
  const statusVariants = {
    done: 'text-gray-400',
    todo: 'text-gray-400',
    overdue: 'text-gray-400',
  };

  const statusClass = statusVariants[taskStatus] || statusVariants.todo;

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
      <p className={cn('break-words', statusClass)}>{task.description}</p>
    )}
  </div>
);}
  