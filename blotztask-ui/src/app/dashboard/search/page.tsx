'use client';
import SearchTitle from './components/search-title';
import { useSearchTaskStore } from '../store/search-task-store';
import TaskCard from '../today/components/task-card';

export default function Page() {
  const { query, filteredTasks } = useSearchTaskStore();

  const handleCheckboxChange = () => {
    console.log('Checkbox changed!');
  };

  const handleTaskDelete = () => {
    console.log('Task deleted successfully!');
  };

  const handleTaskDeleteUndo = () => {
    console.log('Deleted task restored!');
  };
  const handleTaskEdit = () => {
    console.log('Task edited successfully!');
  };

  return (
    <div className="min-h-screen">
      <SearchTitle />
      {query.length > 1 &&
        filteredTasks.map((task) => (
          <div key={task.id}>
            <TaskCard
              task={task}
              handleCheckboxChange={handleCheckboxChange}
              handleTaskDelete={handleTaskDelete}
              handleTaskDeleteUndo={handleTaskDeleteUndo}
              handleTaskEdit={handleTaskEdit}
            ></TaskCard>
          </div>
        ))}

      {(filteredTasks.length === 0 || query.length === 0) && <p>No matching task found</p>}
    </div>
  );
}
