import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TaskDetailDTO } from '../../task-list/models/task-detail-dto';

const DeleteTaskDialog = ({
  onDelete,
  handleUndo,
  task,
}: {
  onDelete: (id: number) => void;
  handleUndo: (task: TaskDetailDTO) => void;
  task: TaskDetailDTO;
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button>
          <Trash2 className="text-primary" size={20} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete This Task?</AlertDialogTitle>
          <AlertDialogDescription>A task will be permanently deleted.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-between mt-4 gap-4">
          <AlertDialogCancel className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete(task.id);
              setTimeout(() => {
                toast('Task Deleted', {
                  classNames: {
                    toast: 'flex justify-between items-center bg-blue-100 w-64',
                    title: 'text-gray-500',
                  },
                  action: (
                    <button className="text-blue-500" onClick={() => handleUndo(task)}>
                      Undo
                    </button>
                  ),
                  position: 'bottom-left',
                  duration: 4000,
                });
              }, 100);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTaskDialog;
