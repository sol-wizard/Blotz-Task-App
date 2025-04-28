import TaskSeparator from '../../shared/task-separator';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { taskFormSchema } from '../../forms/task-form-schema';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import type { TaskDetailDTO } from '../../../../../model/task-detail-dto';
import type { RawEditTaskDTO } from '../../../../../model/raw-edit-task-dto';
import { TaskCardTitleBlock } from '../ui/task-card-title-block';
import { TaskCardDescriptionBlock } from '../ui/task-card-description-block';
import { TaskCardLabelBlock } from '../ui/task-card-label-block';
import { TaskEditActions } from '../ui/task-card-edit-actions-block';
import { TaskCardEditFooter } from '../ui/task-card-edit-footer';
import { cn } from '@/lib/utils';

export type TaskCardStatus = 'todo' | 'done' | 'overdue';

type TaskCardProps = {
  task: TaskDetailDTO;
  status?: TaskCardStatus; // optional, default to 'todo'
  onSubmit: (taskContent: RawEditTaskDTO) => void;
  onDelete: (taskId: number) => void;
  handleTaskDeleteUndo: (taskId: number) => void;
};

const defaultTaskFormValues = {
  title: '',
  description: '',
  status: 'todo',
  date: new Date(),
  labelId: undefined,
  time: undefined,
};

export default function TaskCard({
  task,
  status = 'todo',
  onSubmit,
  onDelete,
  handleTaskDeleteUndo,
}: TaskCardProps) {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultTaskFormValues,
  });

  const [isEditing, setIsEditing] = useState(false);
  const handleEditState = () => setIsEditing(!isEditing);

  const handleFormSubmit = (data, task: TaskDetailDTO) => {
    const taskContent: RawEditTaskDTO = {
      id: task.id,
      title: data.title ?? task.title,
      description: data.description ?? '',
      isDone: task.isDone,
      labelId: data.labelId,
      date: data.date,
      time: data.time,
    };
    onSubmit(taskContent);
  };

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description,
        date: new Date(task.dueDate),
        labelId: task.label.labelId,
        time: task.hasTime ? format(new Date(task.dueDate), 'h:mm a') : 'Time',
      });
    }
  }, [task, form]);

  const bgTaskCard = {
    overdue: 'bg-red-50',
    todo: 'bg-transparent',
    done: 'bg-transparent',
  };

  const bgTaskCardstatusClass = bgTaskCard[status] || bgTaskCard.todo;

  return (
    <div className={cn('flex flex-col w-full', bgTaskCardstatusClass)}>
      <div className="flex flex-row w-full bg-transparent group mb-2">
        <TaskSeparator color={task.label.color} taskStatus={status} />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              handleFormSubmit(data, task);
              handleEditState();
            })}
            className="flex flex-col w-full bg-transparent px-6"
          >
            <div className="flex flex-col w-full bg-transparent px-6">
              <TaskCardTitleBlock
                task={task}
                taskStatus={status}
                isEditing={isEditing}
                control={form.control}
                errors={form.formState.errors}
              />

              <div className="flex w-full text-base text-gray-500 mt-2">
                <TaskCardDescriptionBlock
                  task={task}
                  taskStatus={status}
                  isEditing={isEditing}
                  control={form.control}
                  errors={form.formState.errors}
                />
                <TaskCardLabelBlock task={task} isEditing={isEditing} />
                <TaskEditActions
                  task={task}
                  isEditing={isEditing}
                  onEditToggle={handleEditState}
                  onDelete={onDelete}
                  onUndo={handleTaskDeleteUndo}
                />
              </div>

              {isEditing && <TaskCardEditFooter control={form.control} onCancel={handleEditState} />}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
