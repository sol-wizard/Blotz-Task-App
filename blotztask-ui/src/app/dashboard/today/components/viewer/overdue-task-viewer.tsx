import SectionSeparator from '../ui/section-separator';
import TaskCardContainer from '../container/task-card-container';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import React, { Fragment } from 'react';

export function OverdueTaskViewer({
  overdueTasks,
  handleOverdueCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  return (
    <>
      {overdueTasks.length > 0 ? (
        <div className="grid gap-4 w-full ">
          {overdueTasks.map((task: TaskDetailDTO) => (
            <Fragment key={task.id} >
              <TaskCardContainer
                task={task}
                taskStatus="overdue"
                handleCheckboxChange={handleOverdueCheckboxChange}
                handleTaskEdit={handleTaskEdit}
                handleTaskDelete={handleTaskDelete}
                handleTaskDeleteUndo={handleTaskDeleteUndo}
              />
              <SectionSeparator />
            </Fragment>
          ))}
        </div>
      ) : (
        <p>No incomplete tasks for today!</p>
      )}
    </>
  );
}
