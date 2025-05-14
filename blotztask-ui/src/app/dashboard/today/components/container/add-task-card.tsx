'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/task-card-input';
import { Textarea } from '@/components/ui/textarea';
import TimePicker from '@/components/ui/time-picker';
import { Button } from '@/components/ui/button';

//定义所有字段（需要input的内容）的验证规则 -- 内部结构与逻辑
const taskFormSchema = z.object({
  title: z.string().min(1, 'Task name is required'),
  description: z.string().min(1, 'Description is required'),
  labelId: z.string().min(1, 'Label is required'),
  date: z.date({ required_error: 'Date is required' }),
  time: z.string().min(1, 'Time is required'),
});

type FormField = z.infer<typeof taskFormSchema>;

const AddTaskCard = ({
  datePickerRef,
  labelPickerRef,
  timePickerRef,
  onCancel,
  onSubmit,
}: {
  datePickerRef?: React.RefObject<HTMLInputElement>;
  labelPickerRef?: React.RefObject<HTMLSelectElement>;
  timePickerRef?: React.RefObject<HTMLDivElement>;
  onCancel: () => void;
  onSubmit: (task: {
    title: string;
    description: string;
    labelId: number;
    date: Date;
    time: string;
  }) => void;
}) => {
  const form = useForm<FormField>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      labelId: '',
      date: new Date(),
      time: '',
    },
  });

  const handleSubmit = (data: FormField) => {
    onSubmit({
      title: data.title,
      description: data.description,
      labelId: Number(data.labelId),
      date: data.date,
      time: data.time,
    });
    form.reset();
  };

  return (
    <Form {...form}>
      <form className="flex flex-col w-full space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Enter task title" className="font-bold text-base" {...field} />
              </FormControl>
              <FormMessage className="text-red-500 font-bold animate-pulse" />
            </FormItem>
          )}
        />

        {/* Description */}
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

        {/* Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <input
                  type="date"
                  className="border px-2 py-1 rounded text-sm"
                  value={field.value.toISOString().split('T')[0]}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  ref={datePickerRef}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Label Select */}
        <FormField
          control={form.control}
          name="labelId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <select
                  className="border px-2 py-1 rounded text-sm"
                  value={field.value}
                  onChange={field.onChange}
                  ref={labelPickerRef}
                >
                  <option value="">Select label</option>
                  <option value="1">Work</option>
                  <option value="2">Personal</option>
                  <option value="3">Urgent</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Time Picker */}
        <TimePicker control={form.control} timePickerRef={timePickerRef} />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Add Task</Button>
        </div>
      </form>
    </Form>
  );
};

export default AddTaskCard;