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

const DeleteTaskDialog = ({ onDelete, taskId }: { onDelete: (id: number) => void; taskId: number }) => {
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
            onClick={() => onDelete(taskId)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 "
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTaskDialog;
