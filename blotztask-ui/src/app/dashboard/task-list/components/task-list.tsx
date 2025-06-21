import SectionSeparator from '../../shared/components/ui/section-separator';
import TaskCardContainer from '../../shared/components/taskcard/task-card-container';
import { Fragment } from 'react';

export function TaskList({
  tasks,
  handleCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  return (
    <div className="grid gap-4 w-full">
      {tasks.map((task) => (
        <Fragment key={task.id}>
          <TaskCardContainer
            task={task}
            handleCheckboxChange={handleCheckboxChange}
            handleTaskEdit={handleTaskEdit}
            handleTaskDelete={handleTaskDelete}
            handleTaskDeleteUndo={handleTaskDeleteUndo}
          ></TaskCardContainer>
          <SectionSeparator />
        </Fragment>
      ))}
    </div>
  );
}
