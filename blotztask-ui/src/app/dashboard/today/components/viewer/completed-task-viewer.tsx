import SectionSeparator from '../../../shared/components/ui/section-separator';
import TaskCardContainer from '@/app/dashboard/shared/components/taskcard/task-card-container';
import { Fragment } from 'react';

export function CompletedTaskViewer({
  completedTasks,
  handleCompletedCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  return (
    <>
      {completedTasks.length > 0 ? (
        <div className="grid gap-4 w-full">
          {completedTasks.map((task) => (
            <Fragment key={task.id}>
              <TaskCardContainer
                task={task}
                taskStatus="done"
                handleCheckboxChange={handleCompletedCheckboxChange}
                handleTaskEdit={handleTaskEdit}
                handleTaskDelete={handleTaskDelete}
                handleTaskDeleteUndo={handleTaskDeleteUndo}
              />
              <SectionSeparator />
            </Fragment>
          ))}
        </div>
      ) : (
        <p>No completed tasks for today!</p>
      )}
    </>
  );
}
