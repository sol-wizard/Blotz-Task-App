'use client';

import { useEffect } from 'react';
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
} from '../../store/today-task-store';
import SectionSeparator from './components/section-separator';
import DisplayNoTask from './components/display-no-task';

export default function Today() {
  const todayTasks = useTodayTasks();
  const incompleteTodayTasks = useIncompleteTodayTasks();
  const completedTodayTasks = useCompletedTodayTasks();
  const todayTasksIsLoading = useTodayTasksIsLoading();

  const {
    loadTodayTasks,
    handleAddTask,
    handleEditTask,
    handleDeleteTask,
    handleTaskDeleteUndo,
    handleCheckboxChange,
  } = useTodayTaskActions();

  useEffect(() => {
    loadTodayTasks();
  }, []);

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
                <div className="flex flex-col gap-4 w-full">
                  <Divider text="To Do" />
                  <SectionSeparator />
                  {/* TODO: Make this into a todoTaskViewer component as similar to the completedTaskViewer */}
                  {incompleteTodayTasks.length > 0 ? (  
                    incompleteTodayTasks.map((task) => (  
                      <>
                        <TaskCard
                          key={task.id}
                          task={task}
                          handleCheckboxChange={handleCheckboxChange}
                          handleTaskEdit={handleEditTask}
                          handleTaskDelete={handleDeleteTask}
                          handleTaskDeleteUndo={handleTaskDeleteUndo}
                        ></TaskCard>
                        <SectionSeparator />
                      </>
                    ))
                  ) : (
                    <p>No incomplete tasks for today!</p>
                  )}
                  
                  {completedTodayTasks.length > 0 && (
                    <>
                      <Divider text="Done" />
                      <SectionSeparator />
                      <CompletedTaskViewer
                        completedTasks={completedTodayTasks}
                        handleCompletedCheckboxChange={handleCheckboxChange}
                        handleTaskEdit={handleEditTask}
                        handleTaskDelete={handleDeleteTask}
                        handleTaskDeleteUndo={handleTaskDeleteUndo}
                      />
                    </>
                  )}
                </div>
              ) : (
                <DisplayNoTask />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
