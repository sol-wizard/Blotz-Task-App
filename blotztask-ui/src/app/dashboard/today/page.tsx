'use client';

import { useEffect } from 'react';
import TodayHeader from './components/ui/today-header';
import AddTaskCardContainer from '../shared/components/taskcard/add-task-card-container';
import { CompletedTaskViewer } from './components/viewer/completed-task-viewer';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import {
  useCompletedTodayTasks,
  useIncompleteTodayTasks,
  useTodayTaskActions,
  useTodayTasks,
  useTodayTasksIsLoading,
  useOverdueTasks,
} from '../../store/today-task-store';
import SectionSeparator from '../shared/components/ui/section-separator';
import DisplayNoTask from './components/ui/display-no-task';
import SectionHeading from './components/ui/divider';
import { TodoTaskViewer } from './components/viewer/todo-task-viewer';
import { OverdueTaskViewer } from '../shared/components/taskcard/overdue-task-viewer';

export default function Today() {
  const todayTasks = useTodayTasks();
  const overdueTasks = useOverdueTasks();
  const incompleteTodayTasks = useIncompleteTodayTasks();
  const completedTodayTasks = useCompletedTodayTasks();
  const todayTasksIsLoading = useTodayTasksIsLoading();

  const {
    loadTodayTasks,
    loadOverdueTasks,
    handleAddTask,
    handleEditTask,
    handleDeleteTask,
    handleTaskDeleteUndo,
    handleCheckboxChange,
  } = useTodayTaskActions();

  useEffect(() => {
    loadTodayTasks();
    loadOverdueTasks();
  }, [loadTodayTasks, loadOverdueTasks]);

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
            <AddTaskCardContainer onAddTask={(newTaskData) => handleAddTask(newTaskData)} />

            <div className="flex items-start h-full">
              {incompleteTodayTasks.length > 0 || completedTodayTasks.length > 0 || overdueTasks.length > 0 ? (
                <div className="flex flex-col gap-4 w-full">
                  {overdueTasks.length > 0 && (
                    <>
                      <SectionHeading text="Overdue" />
                      <SectionSeparator />
                      <OverdueTaskViewer
                        overdueTasks={overdueTasks}
                        handleOverdueCheckboxChange={handleCheckboxChange}
                        handleTaskEdit={handleEditTask}
                        handleTaskDelete={handleDeleteTask}
                        handleTaskDeleteUndo={handleTaskDeleteUndo}
                      />
                    </>
                  )}

                  {incompleteTodayTasks.length > 0 && (
                    <>
                      <SectionHeading text="To Do" />
                      <SectionSeparator />
                      <TodoTaskViewer
                        todoTasks={incompleteTodayTasks}
                        handleTodoCheckboxChange={handleCheckboxChange}
                        handleTaskEdit={handleEditTask}
                        handleTaskDelete={handleDeleteTask}
                        handleTaskDeleteUndo={handleTaskDeleteUndo}
                      />
                    </>
                  )}

                  {completedTodayTasks.length > 0 && (
                    <>
                      <SectionHeading text="Done" />
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
