import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import TaskContent from './task-content';
import SectionSepreator from './section-separator';

const TaskCard = ({ task, handleCheckboxChange, handleTaskEdit, handleTaskDelete, handleTaskDeleteUndo }) => {
  return (
    <div>
      <div className="flex w-full">
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
        />
      </div>
      <SectionSepreator />
    </div>
  );
};

export default TaskCard;
