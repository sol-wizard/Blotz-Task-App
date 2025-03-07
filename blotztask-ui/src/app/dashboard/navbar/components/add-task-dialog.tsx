import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import GlobalAddTaskForm from './global-add-task-form';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { addTaskItem } from '@/services/taskService';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Plus } from 'lucide-react';

const AddTaskDialog = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddTask = async (taskDetails: AddTaskItemDTO) => {
    try {
      await addTaskItem(taskDetails);
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const wait = () => new Promise((resolve) => setTimeout(resolve, 100));

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <div className="flex items-center gap-4 py-10 px-4 w-full hover:bg-white">
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
          </div>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <GlobalAddTaskForm
          onSubmit={(newTaskData) => {
            handleAddTask(newTaskData);
            wait().then(() => setDialogOpen(false));
          }}
          onCancel={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
