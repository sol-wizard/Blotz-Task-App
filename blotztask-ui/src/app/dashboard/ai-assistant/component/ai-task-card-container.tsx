import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import TaskCard, { TaskCardStatus } from '../../shared/components/taskcard/task-card';

type AITaskCardContainerProps = {
  task: TaskDetailDTO;
  taskStatus?: TaskCardStatus;
  handleCheckboxChange: (task: TaskDetailDTO) => void;
  handleTaskEdit: (updatedTask: RawEditTaskDTO) => void;
  handleTaskDelete: (taskId: number) => void;
};

export default function AITaskCardContainer({
  task,
  taskStatus,
  handleCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
}: AITaskCardContainerProps) {
  return (
    <div>
      <div className="flex w-full">
        <div className="flex justify-start items-center">
          <Checkbox
            checked={task.isDone}
            onCheckedChange={() => handleCheckboxChange(task)}
            className="h-6 w-6 mr-6 rounded-full border-2 border-black"
          />
        </div>
        <TaskCard
          task={task}
          status={taskStatus}
          onSubmit={handleTaskEdit}
          onDelete={(taskId) => handleTaskDelete(taskId)}
        />
      </div>
    </div>
  );
}