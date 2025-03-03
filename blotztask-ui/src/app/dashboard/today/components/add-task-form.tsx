import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/task-card-input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { CalendarForm } from '../shared/calendar-form';
import { LabelSelect } from '../shared/label-select';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { format } from 'date-fns';
import { taskFormSchema } from '../forms/task-form-schema';

type FormField = z.infer<typeof taskFormSchema>;

const AddTaskForm = ({ onSubmit, datePickerRef, labelPickerRef, onCancel }) => {
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
  };

  return (
    <Form {...form}>
      <form className="flex flex-col w-full space-y-2" onSubmit={form.handleSubmit(handleAddTask)}>
        <div className="flex flex-col w-full">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Enter task title" className="font-bold text-base" {...field}></Input>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder="Fill in the detailed information" className="w-full" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-row justify-between mt-4 mb-2">
          <div className="flex flex-row items-center">
            <CalendarForm control={form.control} datePickerRef={datePickerRef} />
            <LabelSelect control={form.control} labelPickerRef={labelPickerRef} />
          </div>
          <div className="flex flex-row h-8 mr-6">
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

export default AddTaskForm;
