import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '@/components/ui/form';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { taskFormSchema } from '../forms/task-form-schema';
import AddTaskForm from '../shared/add-task-form';
import { parse, setHours, setMinutes } from 'date-fns';

type FormField = z.infer<typeof taskFormSchema>;

const AddTaskContainer = ({ onSubmit, onCancel }) => {
  const form = useForm<FormField>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      labelId: undefined,
      time: '',
    },
  });

  // I will move all the duplicate handleAddTask functions to store in another pbi
  const handleAddTask: SubmitHandler<FormField> = async (data) => {
    let dateTime: string;
    if (data.time) {
      const parsedTime = parse(data.time, 'h:mm a', new Date());
      dateTime = setMinutes(
        setHours(data.date, parsedTime.getHours()),
        parsedTime.getMinutes()
      ).toISOString();
    }
    const taskDetails: AddTaskItemDTO = {
      title: data.title,
      description: data.description ?? '',
      dueDate: dateTime,
      labelId: data.labelId ?? 0,
    };
    onSubmit(taskDetails);
  };

  return (
    <Form {...form}>
      <form className="flex flex-col w-full space-y-2" onSubmit={form.handleSubmit(handleAddTask)}>
        <div className="flex flex-row justify-between items-center">
          <AddTaskForm form={form} />
          <div className="flex flex-row h-8 ml-4 mt-20">
            <button
              className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20 hover:bg-gray-100"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary rounded-lg px-3 py-1 text-xs text-white w-20 hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default AddTaskContainer;
