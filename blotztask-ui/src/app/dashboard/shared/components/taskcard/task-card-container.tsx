import { Checkbox } from '@/components/ui/checkbox';
import React, { useState } from 'react';
import TaskCard, { TaskCardStatus } from './task-card';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { cn } from '@/lib/utils';

type TaskCardContainerProps = {
  task: TaskDetailDTO;
  taskStatus?: TaskCardStatus;
  isAnimated?: boolean;
  handleCheckboxChange: (taskId: number) => void;
  handleTaskEdit: (updatedTask: RawEditTaskDTO) => void;
  handleTaskDelete: (taskId: number) => void;
  handleTaskDeleteUndo: (taskId: number) => void;
};

export default function TaskCardContainer({
  task,
  taskStatus,
  handleCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}: TaskCardContainerProps) {
  const [isFlashingGreen, setIsFlashingGreen] = useState(false);

  const handleClick = () => {
    setIsFlashingGreen(true);
    handleCheckboxChange(task.id);
    setTimeout(() => setIsFlashingGreen(false), 100);
    handleCheckboxChange(task.id);
  };

  return (
    <div>
      <div className="flex w-full">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={task.isDone}
            onCheckedChange={handleClick}
            className={cn(
              'h-6 w-6 mx-3 rounded-full border-2 border-black transition-colors duration-100',
              isFlashingGreen ? 'bg-green-500' : 'bg-transparent'
            )}
          />
        </div>
        <TaskCard
          task={task}
          status={taskStatus}
          onSubmit={handleTaskEdit}
          onDelete={(taskId) => handleTaskDelete(taskId)}
          handleTaskDeleteUndo={handleTaskDeleteUndo}
        />
      </div>
    </div>
  );
}
