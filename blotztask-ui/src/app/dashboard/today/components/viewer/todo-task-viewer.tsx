import SectionSeparator from '../ui/section-separator';
import TaskCardContainer from '../container/task-card-container';
import { Fragment } from 'react';

export function TodoTaskViewer({
  todoTasks,
  handleTodoCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  return (
    <>
      {todoTasks.length > 0 ? (
        <div className="grid gap-4 w-full">
          {todoTasks.map((task) => (
            <Fragment key={task.id}>
              <TaskCardContainer
                key={task.id}
                task={task}
                taskStatus="todo"
                handleCheckboxChange={handleTodoCheckboxChange}
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
