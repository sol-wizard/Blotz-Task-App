import TaskCard from './task-card';

export function CompletedTaskViewer({
  completedTasks,
  handleCompletedCheckboxChange,
}) {
  return (
    <div>
      <div className="grid gap-6 w-full">
        {completedTasks.length > 0 ? (
          <div className="grid gap-6 w-full">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                handleCheckboxChange={handleCompletedCheckboxChange}
              />
            ))}
          </div>
        ) : (
          <p>No completed tasks for today!</p>
        )}
      </div>
    </div>
  );
}
