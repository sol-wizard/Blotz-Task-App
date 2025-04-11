import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import GlobalAddTaskForm from './global-add-task-form';
import { useState } from 'react';

//TODO : Check with Nicole why we need to pass the trigger as child, why not just implement the button here
const AddTaskDialog = ({ handleAddTask, children }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <GlobalAddTaskForm
          onSubmit={(newTaskData) => {
            handleAddTask(newTaskData);
            setDialogOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
