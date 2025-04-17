'use client';

import { useEffect } from 'react';
import { addTaskItem, deleteTask, editTask, undoDeleteTask, updateTaskStatus } from '@/services/task-service';
import TodayHeader from './components/today-header';
import TaskCard from './components/task-card';
import AddTaskCard from './components/add-task-card';
import { CompletedTaskViewer } from './components/completed-task-viewer';
import Divider from './components/divider';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import {
  useCompletedTodayTasks,
  useIncompleteTodayTasks,
  useTodayTaskActions,
  useTodayTasks,
  useTodayTasksIsLoading,
} from '../store/today-store/today-task-store';
import SectionSeparator from './components/section-separator';
import { RawAddTaskDTO } from '../../../model/raw-add-task-dto';
import { RawEditTaskDTO } from '../../../model/raw-edit-task-dto';
import DisplayNoTask from './components/display-no-task';

export default function Today() {
  const todayTasks = useTodayTasks();
  const incompleteTodayTasks = useIncompleteTodayTasks();
  const completedTodayTasks = useCompletedTodayTasks();
  const todayTasksIsLoading = useTodayTasksIsLoading();

  const { loadTodayTasks: loadTasks } = useTodayTaskActions();

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /** Helper function to handle API action ensure consistent behaviour and avoid duplicate code */
  const handleAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await loadTasks();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };
  const handleAddTask = async (taskDetails: RawAddTaskDTO) => {
    handleAction(() => addTaskItem(taskDetails));
  };

  const handleTaskEdit = async (updatedTask: RawEditTaskDTO) => {
    handleAction(() => editTask(updatedTask));
  };

  const handleTaskDelete = async (taskId: number) => {
    handleAction(() => deleteTask(taskId));
  };

  const handleTaskDeleteUndo = async (taskId: number) => {
    handleAction(() => undoDeleteTask(taskId));
  };

  const handleCheckboxChange = async (taskId: number) => {
    handleAction(() => updateTaskStatus(taskId));
  };

  return (
    <div className="ml-5 flex flex-col gap-12 h-full">
      <div className="flex flex-col gap-6 h-full">
        {todayTasksIsLoading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div>
              <LoadingSpinner variant="blue" className="mb-12 ml-8 text-[10px]" />
              <p className="font-semibold text-zinc-600">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            <TodayHeader tasks={todayTasks} />
            <AddTaskCard onAddTask={(newTaskData) => handleAddTask(newTaskData)} />
            
            <div className="flex items-start h-full">
              {incompleteTodayTasks.length > 0 || completedTodayTasks.length > 0 ? (
                <div className="flex flex-col gap-6 w-full">
                    <Divider text="To Do" />
                    <SectionSeparator />
                    {incompleteTodayTasks.length > 0 ? (
                      incompleteTodayTasks.map((task) => (
                        <>
                          <TaskCard
                            key={task.id}
                            task={task}
                            handleCheckboxChange={handleCheckboxChange}
                            handleTaskEdit={handleTaskEdit}
                            handleTaskDelete={handleTaskDelete}
                            handleTaskDeleteUndo={handleTaskDeleteUndo}
                          ></TaskCard>
                          <SectionSeparator />
                        </>
                      ))
                    ) : (
                      <p>No incomplete tasks for today!</p>
                    )}
                  {completedTodayTasks.length > 0 &&
                    <>
                      <Divider text="Done" />
                      <SectionSeparator />
                      <CompletedTaskViewer
                        completedTasks={completedTodayTasks}
                        handleCompletedCheckboxChange={handleCheckboxChange}
                        handleTaskEdit={handleTaskEdit}
                        handleTaskDelete={handleTaskDelete}
                        handleTaskDeleteUndo={handleTaskDeleteUndo}
                      />
                    </>
                  }
                </div>
              ) : (
                <DisplayNoTask/>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
