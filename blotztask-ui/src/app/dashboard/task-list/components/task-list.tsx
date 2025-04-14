import SectionSeparator from '../../today/components/section-separator';
import TaskCard from '../../today/components/task-card';

export function TaskList({
  tasks,
  handleCheckboxChange,
  handleTaskEdit,
  handleTaskDelete,
  handleTaskDeleteUndo,
}) {
  return (
    <div className="flex flex-col mt-10 w-full">
      {tasks.map((task) => (
        <div key={task.id} className="w-full mt-5">
          <TaskCard
            task={task}
            handleCheckboxChange={handleCheckboxChange}
            handleTaskEdit={handleTaskEdit}
            handleTaskDelete={handleTaskDelete}
            handleTaskDeleteUndo={handleTaskDeleteUndo}
          ></TaskCard>
          <SectionSeparator />
        </div>
      ))}
    </div>
  );
}
