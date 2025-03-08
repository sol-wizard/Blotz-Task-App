import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import GlobalAddTaskForm from './global-add-task-form';
import { useState } from 'react';

const AddTaskDialog = ({ handleAddTask, children }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const wait = () => new Promise((resolve) => setTimeout(resolve, 100));

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <GlobalAddTaskForm
          onSubmit={(newTaskData) => {
            handleAddTask(newTaskData);
            wait().then(() => setDialogOpen(false));
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
