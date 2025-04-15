'use client';
import SearchTitle from './components/search-title';
import { useFilteredTasks, useQuery, useSearchTaskActions } from '../../store/search-task-store';
import TaskCard from '../today/components/task-card';

export default function Page() {
  const query = useQuery();
  const filteredTasks = useFilteredTasks();
  const { handleEditTask, handleCheckboxChange, handleDeleteTask, handleTaskDeleteUndo } =
    useSearchTaskActions();

  return (
    <div className="min-h-screen">
      <SearchTitle />
      {query.length > 1 &&
        filteredTasks.map((task) => (
          <div key={task.id}>
            <TaskCard
              task={task}
              handleCheckboxChange={handleCheckboxChange}
              handleTaskDelete={handleDeleteTask}
              handleTaskDeleteUndo={handleTaskDeleteUndo}
              handleTaskEdit={handleEditTask}
            ></TaskCard>
          </div>
        ))}

      {(filteredTasks.length === 0 || query.length === 0) && <p>No matching task found</p>}
    </div>
  );
}
