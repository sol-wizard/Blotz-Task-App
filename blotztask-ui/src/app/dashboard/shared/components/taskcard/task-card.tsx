import TaskSeparator from '../ui/task-separator';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { taskFormSchema } from '../../forms/task-form-schema';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import type { TaskDetailDTO } from '../../../../../model/task-detail-dto';
import type { RawEditTaskDTO } from '../../../../../model/raw-edit-task-dto';
import { TaskCardTitleBlock } from './task-card-title-block';
import { TaskCardDescriptionBlock } from './task-card-description-block';
import { TaskEditActions } from './task-card-edit-actions-block';
import { TaskCardEditFooter } from './task-card-edit-footer';
import { cn } from '@/lib/utils';
import { LabelDTO } from '@/model/label-dto';
import { fetchAllLabel } from '@/services/label-service';

export type TaskCardStatus = 'todo' | 'done' | 'overdue';

type TaskCardProps = {
  task: TaskDetailDTO;
  status?: TaskCardStatus; // optional, default to 'todo'
  onSubmit: (taskContent: RawEditTaskDTO) => void;
  onDelete: (taskId: number) => void;
  handleTaskDeleteUndo?: (taskId: number) => void; //This is nullable because AI task card dont have to undo the delete
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
  const [labels, setLabels] = useState<LabelDTO[]>([]);
  const watchLabelId = form.watch('labelId');
  const handleEditState = () => setIsEditing(!isEditing);

  useEffect(() => {
    fetchAllLabel()
      .then((labelData) => setLabels(labelData))
      .catch((error) => console.error('Error loading labels:', error));
  }, []);

  const getCurrentLabelColor = () => {
    if (isEditing && watchLabelId) {
      const selectedLabel = labels.find((label) => label.labelId === watchLabelId);
      return selectedLabel?.color || task.label.color;
    }
    return task.label.color;
  };

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
        time: task.hasTime ? format(new Date(task.dueDate), 'h:mm a') : undefined,
      });
    }
  }, [task, form]);

  const handleCancelEdit = () => {
    form.setValue('labelId', task.label.labelId);
    handleEditState();
  };

  const bgTaskCard = {
    overdue: 'bg-red-50',
    todo: 'bg-transparent',
    done: 'bg-transparent',
  };

  const bgTaskCardstatusClass = bgTaskCard[status] || bgTaskCard.todo;

  return (
    <div className={cn('flex flex-col w-full', bgTaskCardstatusClass)}>
      <div className="flex flex-row w-full bg-transparent group">
        <TaskSeparator color={getCurrentLabelColor()} taskStatus={status} />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              handleFormSubmit(data, task);
              handleEditState();
            })}
            className="flex flex-col w-full bg-transparent px-6"
          >
            <div className="flex flex-col w-full bg-transparent px-2">
              <TaskCardTitleBlock
                task={task}
                taskStatus={status}
                isEditing={isEditing}
                control={form.control}
                errors={form.formState.errors}
              />

              <div className="flex w-full text-base text-gray-500 py-2">
                <TaskCardDescriptionBlock
                  task={task}
                  taskStatus={status}
                  isEditing={isEditing}
                  control={form.control}
                  errors={form.formState.errors}
                />
                <TaskEditActions
                  task={task}
                  isEditing={isEditing}
                  onEditToggle={handleEditState}
                  onDelete={onDelete}
                  onUndo={handleTaskDeleteUndo}
                />
              </div>

              {isEditing && <TaskCardEditFooter control={form.control} onCancel={handleCancelEdit} />}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
