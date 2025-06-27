import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { taskFormSchema } from '../../shared/forms/task-form-schema';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import type { TaskDetailDTO } from '@/model/task-detail-dto';
import { TaskCardEditFooter } from '../../shared/components/taskcard/task-card-edit-footer';
import { LabelDTO } from '@/model/label-dto';
import { fetchAllLabel } from '@/services/label-service';
import TaskSeparator from '../../shared/components/ui/task-separator';
import { ChatTaskEditActions } from './chat-task-edit-actions-block';
import { ChatTaskCardTitleBlock } from './chat-taskcard-title-block';
import { CalendarDaysIcon } from 'lucide-react';
import { ChatTaskCardDescriptionBlock } from './chat-taskcard-description-block';

export type TaskCardStatus = 'todo' | 'done' | 'overdue';

type TaskCardProps = {
  task: TaskDetailDTO;
  onSubmit: (taskContent: TaskDetailDTO) => void;
  onDelete: (taskId: number) => void;
};

const defaultTaskFormValues = {
  title: '',
  description: '',
  status: 'todo',
  date: new Date(),
  labelId: undefined,
  time: undefined,
};

export default function ChatSidePanelTaskcard({ task, onSubmit, onDelete }: TaskCardProps) {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultTaskFormValues,
  });

  const [isHovered, setIsHovered] = useState(false);
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

  const handleFormSubmit = () => {};

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

  return (
    <div className="p-4 shadow-md space-y-2 border-2 rounded-xl w-[100%]">
      <div className="flex flex-row gap-3">
        <TaskSeparator color={getCurrentLabelColor()} />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(() => {
              handleFormSubmit();
              handleEditState();
            })}
            className="pr-2 flex flex-col gap-1 flex-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <ChatTaskCardTitleBlock
              task={task}
              isEditing={isEditing}
              control={form.control}
              errors={form.formState.errors}
            />
            <div className="flex w-full text-base text-gray-500 py-2">
              <ChatTaskCardDescriptionBlock
                task={task}
                isEditing={isEditing}
                control={form.control}
                errors={form.formState.errors}
              />
            </div>

            {!isEditing && (
              <div className="text-xs text-zinc-600 flex flex-row justify-between items-center">
                <span className="flex flex-row justify-start gap-1">
                  <CalendarDaysIcon size={14} stroke="#52525b" />
                  {task.dueDate.toLocaleDateString()}
                </span>
                <ChatTaskEditActions
                  isEditing={isEditing}
                  isHovered={isHovered}
                  onEditToggle={handleEditState}
                  onDelete={onDelete}
                  taskId={task.id}
                />
              </div>
            )}

            {isEditing && <TaskCardEditFooter control={form.control} onCancel={handleCancelEdit} />}
          </form>
        </Form>
      </div>
    </div>
  );
}
