import { TaskDetailDTO } from '@/model/task-detail-dto';
import TaskSeparator from '../../shared/components/ui/task-separator';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { taskFormSchema } from '../../shared/forms/task-form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TaskCardTitleBlock } from '../../shared/components/taskcard/task-card-title-block';
import { TaskCardDescriptionBlock } from '../../shared/components/taskcard/task-card-description-block';
import { CalendarForm } from '../../shared/components/ui/calendar-form';
import { LabelSelect } from '../../shared/components/ui/label-select';
import TimePicker from '@/components/ui/time-picker';

export default function AiTaskCard({ task }: { task: TaskDetailDTO }) {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: '',
      date: new Date(),
      labelId: undefined,
      time: undefined,
    },
  });
  return (
    <div className="flex min-h-[48px] items-stretch">
      <TaskSeparator color={task.label.color} className="!h-auto mx-2" />
      <div className="flex flex-col">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              console.log('Form submitted:', data);
            })}
          >
            <TaskCardTitleBlock
              task={task}
              control={form.control}
              isEditing={true}
              errors={form.formState.errors}
            />
            <TaskCardDescriptionBlock
              task={task}
              isEditing={true}
              control={form.control}
              errors={form.formState.errors}
            />
            <div className="flex flex-col gap-1">
              <CalendarForm control={form.control} className="w-20" />
              <LabelSelect control={form.control} />
              <TimePicker control={form.control} className="ml-0 w-32" />
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
