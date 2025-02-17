import TaskCard from '../../today/components/task-card';

export function TaskList({ tasks, handleCheckboxChange, handleTaskEdit, handleTaskDelete }) {
  return (
    <div className="flex flex-col mt-10 w-full">
      {tasks.map((task) => (
        <div key={task.id} className="w-full mt-5">
          <TaskCard
            task={task}
            handleCheckboxChange={handleCheckboxChange}
            handleTaskEdit={handleTaskEdit}
            handleTaskDelete={handleTaskDelete}
          ></TaskCard>
        </div>
      ))}
    </div>
  );
}
