import React from 'react';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogClose } from '@radix-ui/react-dialog';

const DeleteTaskDialog = ({ onDelete, taskId }: { onDelete: (id: number) => void; taskId: number }) => {
  return (
    <DialogContent className="sm:max-w-[425px] bg-white rounded-lg shadow-lg p-6 z-50">
      <DialogHeader>
        <DialogTitle>Delete This Task?</DialogTitle>
      </DialogHeader>
      <p>A task will be permanently deleted.</p>
      <DialogFooter className="flex justify-between mt-4 gap-4">
        <DialogClose asChild>
          <button type="button" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
            Cancel
          </button>
        </DialogClose>
        <button
          type="button"
          onClick={() => onDelete(taskId)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 "
        >
          Delete
        </button>
      </DialogFooter>
    </DialogContent>
  );
};

export default DeleteTaskDialog;
