import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/task-card-input';
import DateTag from '../ui/due-date-tag';
import { cn } from '@/lib/utils';
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
};

export const TaskCardTitleBlock = ({
  task,
  taskStatus = 'todo',
  isEditing,
  control,
  errors,
}: TaskCardTitleBlockProps) => {
  const statusVariants = {
    done: 'text-gray-400',
    todo: 'text-black',
    overdue: 'text-black',
  };
  const statusClass = statusVariants[taskStatus] || statusVariants.todo;

  return (
    <div className="flex justify-between">
      {isEditing ? (
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input className="font-bold" {...field} />
              </FormControl>
              <FormMessage>{errors.title?.message}</FormMessage>
            </FormItem>
          )}
        />
      ) : (
        <p className={cn('font-bold', statusClass)}>{task.title}</p>
      )}
      {!isEditing && <DateTag task={task} taskStatus={taskStatus} />}
    </div>
  );
};
