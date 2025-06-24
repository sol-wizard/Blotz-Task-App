import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/task-card-input';
import DateAndTimeTag from '../ui/duedate-and-time-tag';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { TaskCardStatus } from './task-card';
import { Control, FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { taskFormSchema } from '../../forms/task-form-schema';

type TaskCardTitleBlockProps = {
  task: TaskDetailDTO;
  taskStatus?: TaskCardStatus;
  isEditing: boolean;
  control: Control<z.infer<typeof taskFormSchema>>;
  errors: FieldErrors<z.infer<typeof taskFormSchema>>;
  className?: string;
};

export const TaskCardTitleBlock = ({
  task,
  isEditing,
  control,
  errors,
}: TaskCardTitleBlockProps) => {
  return (
    <div className="flex py-1 justify-between">
      {isEditing ? (
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input className="text-[#444964]" {...field} />
              </FormControl>
              <FormMessage>{errors.title?.message}</FormMessage>
            </FormItem>
          )}
        />
      ) : (
        <p className="text-[#444964]">
          {task.title}
        </p>
      )}
      {!isEditing && <DateAndTimeTag task={task} />}
    </div>
  );
};