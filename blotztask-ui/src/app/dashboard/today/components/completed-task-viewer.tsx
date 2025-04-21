import SectionSeparator from './section-separator';
import TaskCard from './task-card';

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
            <>
              <TaskCard
                key={task.id}
                task={task}
                handleCheckboxChange={handleCompletedCheckboxChange}
                handleTaskEdit={handleTaskEdit}
                handleTaskDelete={handleTaskDelete}
                handleTaskDeleteUndo={handleTaskDeleteUndo}
              />
              <SectionSeparator />
            </>
          ))}
        </div>
      ) : (
        <p>No completed tasks for today!</p>
      )}
    </>
  );
}
