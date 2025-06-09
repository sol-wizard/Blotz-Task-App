'use client';
import SearchTitle from './components/search-title';
import { useFilteredTasks, useSearchQuery, useSearchTaskActions, useSearchTasksIsLoading } from '../../store/search-task-store';
import TaskCardContainer from '../shared/components/taskcard/task-card-container';
import { Frown } from 'lucide-react';
import LoadingSpinner from '../../../components/ui/loading-spinner';

export default function Page() {
  const query = useSearchQuery();
  const filteredTasks = useFilteredTasks();
  const isLoading = useSearchTasksIsLoading();
  const { handleEditTask, handleCheckboxChange, handleDeleteTask, handleTaskDeleteUndo } =
    useSearchTaskActions();

  return (
    <div className="min-h-screen">
      {isLoading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div>
            <LoadingSpinner variant="blue" className="mb-12 ml-8 text-[10px]" />
            <p className="font-semibold text-zinc-600">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          <SearchTitle />
          {query.length > 1 &&
            filteredTasks.map((task) => (
              <div key={task.id}>
                <TaskCardContainer
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskDelete={handleDeleteTask}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                  handleTaskEdit={handleEditTask}
                ></TaskCardContainer>
              </div>
            ))}

          {(filteredTasks.length === 0 || query.length === 0) && (
          <div className="flex flex-col justify-center items-center h-[calc(100vh-80px)]">
            <Frown color="lightgray" size={58}/>
            <p className="text-[25] font-bold">No matching task found</p>
            <p>Try to search another keyword</p>
          </div>
          )}
        </>
      )}
    </div>
  );
}
