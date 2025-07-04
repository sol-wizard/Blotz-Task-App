import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/task-card-input';
import DateAndTimeTag from '../ui/duedate-and-time-tag';
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
    todo: 'text-gray-400',
    overdue: 'text-gray-400',
  };
  const statusClass = statusVariants[taskStatus] || statusVariants.todo;

  return (
    <div className="flex w-full justify-between">
      {isEditing ? (
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormControl className='w-full'>
                <Input className="font-bold" {...field} />
              </FormControl>
              <FormMessage>{errors.title?.message}</FormMessage>
            </FormItem>
          )}
        />
      ) : (
        <p className={cn('font-bold', statusClass)}>{task.title}</p>
      )}
      {!isEditing && <DateAndTimeTag task={task} taskStatus={taskStatus} />}
    </div>
  );
};
