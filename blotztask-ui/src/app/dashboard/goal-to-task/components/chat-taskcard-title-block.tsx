import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/task-card-input';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { Control, FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { taskFormSchema } from '../../shared/forms/task-form-schema';

type ChatTaskCardTitleBlockProps = {
  task: TaskDetailDTO;
  isEditing: boolean;
  control: Control<z.infer<typeof taskFormSchema>>;
  errors: FieldErrors<z.infer<typeof taskFormSchema>>;
};

export const ChatTaskCardTitleBlock = ({
  task,
  isEditing,
  control,
  errors,
}: ChatTaskCardTitleBlockProps) => {
  return (
    <div >
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
        <p className='font-bold text-md'>{task.title}</p>
      )}
    </div>
  );
};
