import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { taskFormSchema } from '../../today/forms/task-form-schema';
import AddTaskForm from '../../today/shared/add-task-form';
import { Separator } from '@/components/ui/separator';
import TaskSeparator from '../../today/shared/task-separator';
import { DialogClose } from '@radix-ui/react-dialog';
import { DialogFooter } from '@/components/ui/dialog';

type FormField = z.infer<typeof taskFormSchema>;

const GlobalAddTaskForm = ({ onSubmit }) => {
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
  const handleAddTask: SubmitHandler<FormField> = async (taskDetails) => {
    onSubmit(taskDetails);
  };

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-2" onSubmit={form.handleSubmit(handleAddTask)}>
        <div className="flex flex-row justify-center mb-3">
          <div className="w-6 h-6 mt-8 mr-4 border-2 border-gray-400 rounded-full border-dashed"></div>
          <TaskSeparator color="#c7d2fe" className="mx-4" />
          <AddTaskForm form={form} />
        </div>
        <Separator className="bg-indigo-200" />
        <div className="flex flex-row justify-end mt-4">
          <div className="flex flex-row h-8 ml-4">
            <DialogClose asChild>
              <button
                className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20"
                type="button"
              >
                Cancel
              </button>
            </DialogClose>
            <DialogFooter>
              <button type="submit" className="bg-primary rounded-lg px-3 py-1 text-xs text-white w-20">
                Save
              </button>
            </DialogFooter>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default GlobalAddTaskForm;
