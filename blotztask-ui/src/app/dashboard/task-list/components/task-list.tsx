import SectionSeparator from '../../today/components/ui/section-separator';
import TaskCardContainer from '../../today/components/container/task-card-container';

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
          <TaskCardContainer
            task={task}
            handleCheckboxChange={handleCheckboxChange}
            handleTaskEdit={handleTaskEdit}
            handleTaskDelete={handleTaskDelete}
            handleTaskDeleteUndo={handleTaskDeleteUndo}
          ></TaskCardContainer>
          <SectionSeparator />
        </div>
      ))}
    </div>
  );
}
