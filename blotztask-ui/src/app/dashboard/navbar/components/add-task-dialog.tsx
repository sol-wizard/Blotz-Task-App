import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import GlobalAddTaskForm from './global-add-task-form';
import { useState } from 'react';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

const AddTaskDialog = ({ handleAddTask, children }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <GlobalAddTaskForm
          handleSubmit={(value) => {
            handleAddTask(value);
            setDialogOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
