import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '@/components/ui/form';
import { taskFormSchema } from '../../forms/task-form-schema';
import AddTaskForm from '../ui/add-task-form';

type FormField = z.infer<typeof taskFormSchema>;

const AddTaskCard = ({ datePickerRef, labelPickerRef, timePickerRef, onCancel, onSubmit }) => {
  const form = useForm<FormField>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      labelId: undefined,
      time: undefined,
    },
  });

  return (
    <Form {...form}>
      <form className="flex flex-col w-full space-y-2" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-row justify-between items-center">
          <AddTaskForm
            form={form}
            datePickerRef={datePickerRef}
            labelPickerRef={labelPickerRef}
            timePickerRef={timePickerRef}
          />
          <div className="flex flex-row h-8 ml-4 mt-20 mr-10">
            <button
              className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20 hover:bg-gray-100"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-white hover:bg-blue-600 rounded-lg px-3 py-1 text-xs w-20 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default AddTaskCard;
