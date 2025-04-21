import SectionSeparator from '../ui/section-separator';
import TaskCardContainer from '../container/task-card-container';

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
              <TaskCardContainer
                key={task.id}
                task={task}
                taskStatus="done"
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
