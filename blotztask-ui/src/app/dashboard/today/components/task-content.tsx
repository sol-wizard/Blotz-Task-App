import DueDateTag from './due-date-tag';
import TaskSeparator from '../shared/task-separator';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from 'src/components/ui/task-card-input';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { taskFormSchema } from '../forms/task-form-schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { TaskDetailDTO } from '../../task-list/models/task-detail-dto';
import { CalendarForm } from '../shared/calendar-form';
import { LabelSelect } from '../shared/label-select';
import { EditTaskItemDTO } from '../../task-list/models/edit-task-item-dto';
import DeleteTaskDialog from './delete-dialog-content';
import TimePicker from '@/components/ui/time-picker';

export default function TaskContent({
  task,
  onSubmit,
  onDelete,
  handleTaskDeleteUndo,
}: {
  task: TaskDetailDTO;
  onSubmit: (data: z.infer<typeof taskFormSchema>) => void;
  onDelete: (taskId: number) => void;
  handleTaskDeleteUndo: (taskId: number) => void;
}) {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      date: new Date(task.dueDate),
      labelId: task.label.labelId,
      time: undefined,
    },
  });

  const updateTask: SubmitHandler<z.infer<typeof taskFormSchema>> = async (data) => {
    const editTaskDetails: EditTaskItemDTO = {
      id: task.id,
      title: data.title ?? task.title,
      description: data.description ?? '',
      isDone: task.isDone,
      labelId: data.labelId,
      dueDate: data.date.toISOString(),
    };
    onSubmit(editTaskDetails);
  };

  const [isEditing, setIsEditing] = useState(false);
  const handleEditState = () => setIsEditing(!isEditing);

  return (
    <div className="flex flex-col w-full ">
      <div className="flex flex-row w-full bg-transparent group mb-2">
        <TaskSeparator color={task.label.color} isDone={task.isDone} />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              updateTask(data);
              handleEditState();
            })}
            className="flex flex-col w-full bg-transparent px-6"
          >
            <div className="flex flex-col w-full bg-transparent px-6">
              <div className="flex flex-row justify-between w-full">
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input className="font-bold" {...field}></Input>
                        </FormControl>
                        <FormMessage>{form.formState.errors.title?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="font-bold" style={{ color: task.isDone ? '#BFC0C9' : '#000000' }}>
                    {task?.title}
                  </p>
                )}
                {!isEditing && <DueDateTag task={task} />}
              </div>

              <div className="flex w-full text-base text-gray-500 mt-2">
                <div className="flex flex-col w-full">
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder={task?.description}
                              {...field}
                              className="w-full"
                            ></Textarea>
                          </FormControl>
                          <FormMessage>{form.formState.errors.description?.message}</FormMessage>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p
                      style={{ color: task.isDone ? '#BFC0C9' : '#000000' }}
                      className="w-[500px] break-words"
                    >
                      {task?.description}
                    </p>
                  )}
                </div>

                <div className="flex items-start ml-4 w-32 group-hover:hidden">
                  {!isEditing && !task.isDone && (
                    <>
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: task.label.color || 'gray' }}
                      ></div>
                      <span className="ml-2 font-bold">{task.label?.name || 'No label name'}</span>
                    </>
                  )}
                </div>

                {!isEditing && !task.isDone && (
                  <div className="justify-end hidden ml-4 w-32 group-hover:flex">
                    <button className="mx-2.5 p-0.5 hover:bg-[#DEE6FF] rounded-md" onClick={handleEditState}>
                      <Pencil className="text-primary" size={20} />
                    </button>
                    <DeleteTaskDialog
                      task={task}
                      onDelete={onDelete}
                      handleUndo={() => handleTaskDeleteUndo(task.id)}
                    />
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex flex-row justify-between mt-4 mb-2">
                  <div className="flex flex-row items-center">
                    <CalendarForm control={form.control} task={task} />
                    <LabelSelect control={form.control} />
                    <TimePicker control={form.control} />
                  </div>
                  <div className="flex flex-row ">
                    <button
                      className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20"
                      onClick={handleEditState}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="bg-primary rounded-lg px-3 py-1 text-xs text-white w-20">
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
