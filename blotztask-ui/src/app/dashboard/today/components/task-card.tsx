import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import TaskContent from './task-content';
import { isTaskOverdue } from '@/utils/task-utils';
import { cn } from '@/lib/utils';

const TaskCard = ({ task, handleCheckboxChange, handleTaskEdit, handleTaskDelete, handleTaskDeleteUndo }) => {
  const isOverdue = isTaskOverdue(task);

  return (
    <div>
      <div className={cn('flex w-full rounded-lg p-2', isOverdue && 'bg-red-50')}>
        <div className="flex justify-start items-center">
          <Checkbox
            checked={task.isDone}
            onCheckedChange={() => handleCheckboxChange(task.id)}
            className="h-6 w-6 mr-6 rounded-full border-2 border-black"
          />
        </div>
        <TaskContent
          task={task}
          onSubmit={handleTaskEdit}
          onDelete={(taskId) => handleTaskDelete(taskId)}
          handleTaskDeleteUndo={handleTaskDeleteUndo}
          isOverdue={isOverdue}
        />
      </div>
    </div>
  );
};

export default TaskCard;