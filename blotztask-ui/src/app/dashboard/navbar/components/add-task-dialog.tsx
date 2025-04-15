import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import GlobalAddTaskForm from './global-add-task-form';
import { useState } from 'react';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

const AddTaskDialog = ({ handleAddTask }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger>
        <SidebarMenuButton className="flex items-center w-full px-4 py-3 rounded-md hover:bg-blue-100">
          <div
            className={cn(
              'bg-primary',
              'text-white p-1 rounded-sm',
              'inline-flex items-center justify-center'
            )}
          >
            <Plus size={18} />
          </div>
          <span className="text-primary text-xl">New Task</span>
        </SidebarMenuButton>
      </DialogTrigger>
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
