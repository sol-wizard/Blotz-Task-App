import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import TaskCard, { TaskCardStatus } from "./task-card"
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';

type TaskCardContainerProps = {
  task: TaskDetailDTO;
  taskStatus?: TaskCardStatus;
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
  return (
    <div>
      <div className="flex w-full">
        <div className="flex justify-start items-center">
          <Checkbox
            checked={task.isDone}
            onCheckedChange={() => handleCheckboxChange(task.id)}
            className="h-6 w-6 mx-3 rounded-full border-2 border-black"
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