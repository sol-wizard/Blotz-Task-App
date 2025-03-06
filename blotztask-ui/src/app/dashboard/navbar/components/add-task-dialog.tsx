'use client';

import { useState, createContext, useContext, useRef } from 'react';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import GlobalAddTaskForm from './global-add-task-form';
import { addTaskItem } from '@/services/taskService';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';

const DialogContext = createContext({ openDialog: () => {}, taskAdded: false });

export function DialogProvider({ children }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const [taskAdded, setTaskAdded] = useState(false);

  const handleAddTask = async (taskDetails: AddTaskItemDTO) => {
    try {
      await addTaskItem(taskDetails);
      setTaskAdded(true);
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const wait = () => new Promise((resolve) => setTimeout(resolve, 100));

  return (
    <DialogContext.Provider
      value={{
        openDialog: () => {
          setDialogOpen(true);
          console.log('Dialog is open');
        },
        taskAdded,
      }}
    >
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <GlobalAddTaskForm
            onSubmit={(newTaskData) => {
              handleAddTask(newTaskData);
              wait().then(() => setDialogOpen(false));
            }}
            datePickerRef={datePickerRef}
            labelPickerRef={labelPickerRef}
            onCancel={() => setDialogOpen(false)}
          />
        </AlertDialogContent>
      </AlertDialog>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
