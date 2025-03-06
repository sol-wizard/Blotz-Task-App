import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { format } from 'date-fns';
import { taskFormSchema } from '../../today/forms/task-form-schema';
import AddTaskFormField from '../../today/components/add-task-form-field';
import { Separator } from '@/components/ui/separator';
import { TrendingUp } from 'lucide-react';
import TaskSeparator from '../../today/shared/task-separator';

type FormField = z.infer<typeof taskFormSchema>;

const GlobalAddTaskForm = ({ onSubmit, datePickerRef, labelPickerRef, onCancel }) => {
  const form = useForm<FormField>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      labelId: undefined,
    },
  });

  const handleAddTask: SubmitHandler<FormField> = async (data) => {
    const taskDetails: AddTaskItemDTO = {
      title: data.title,
      description: data.description ?? '',
      dueDate: data.date ? format(data.date, 'yyyy-MM-dd') : '',
      labelId: data.labelId ?? 0,
    };
    onSubmit(taskDetails);
    console.log('handleAddTask: ', taskDetails);
  };

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-2" onSubmit={form.handleSubmit(handleAddTask)}>
        <div className="flex flex-row justify-center mb-3">
          <div className="w-6 h-6 mt-8 mr-4 border-2 border-gray-400 rounded-full border-dashed"></div>
          <TaskSeparator color="#c7d2fe" className="mx-4" />
          <AddTaskFormField form={form} datePickerRef={datePickerRef} labelPickerRef={labelPickerRef} />
        </div>
        <Separator className="bg-indigo-200" />
        <div className="flex flex-row justify-end mt-4">
          <div className="flex flex-row h-8 ml-4">
            <button
              className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="bg-primary rounded-lg px-3 py-1 text-xs text-white w-20">
              Save
            </button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default GlobalAddTaskForm;
