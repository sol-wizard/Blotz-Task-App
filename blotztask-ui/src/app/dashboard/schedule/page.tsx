'use client';
import { useEffect } from 'react';
import { useScheduleTaskActions, useScheduleTaskStore } from '../../store/schedule-task-store';
import AddTaskCardContainer from '../shared/components/taskcard/add-task-card-container';
import ScheduleHeader from './components/schedule-header';
import TaskCardContainer from '../shared/components/taskcard/task-card-container';
import SectionSeparator from '../shared/components/ui/section-separator';
import SectionHeading from './components/sectionHeading';
import { OverdueTaskViewer } from '../shared/components/taskcard/overdue-task-viewer';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import { useTodayTaskActions } from '../../store/today-task-store';

export default function Schedule() {
  const { overdueTasks, todayTasks, tomorrowTasks, weekTasks, monthTasks, scheduleTasksIsLoading } =
    useScheduleTaskStore();
  const { loadScheduleTasks, handleAddTask, handleEditTask, handleDeleteTask, handleTaskDeleteUndo, handleCheckboxChange } =
    useScheduleTaskActions();

  const { loadTodayTasks, loadOverdueTasks } = useTodayTaskActions();

  useEffect(() => {
    loadScheduleTasks();
  }, []);

  //TODO: Refactor the today task and overdue task in to a single global state and remove this useEffect
  useEffect(() => {
    loadTodayTasks();
    loadOverdueTasks();
  }, [scheduleTasksIsLoading]);

  return (
    <div className="relative flex flex-col gap-6 h-full min-h-screen">
      <ScheduleHeader />
      <AddTaskCardContainer onAddTask={handleAddTask} />

      {scheduleTasksIsLoading && (
        <div className="inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70">
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <LoadingSpinner variant="blue" className="mb-4 text-[10px]" />
            <p className="mt-8 font-semibold text-zinc-600">Loading...</p>
          </div>
        </div>
      )}
      {!scheduleTasksIsLoading && (
        <div className="flex flex-col gap-4 w-full">
          {overdueTasks.length !== 0 && (
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
          {todayTasks.length !== 0 && (
            <>
              <SectionHeading text={'Today'} />
              <SectionSeparator />
              {todayTasks.map((task) => {
                return (
                  <>
                    <TaskCardContainer
                      key={task.id}
                      task={task}
                      handleCheckboxChange={handleCheckboxChange}
                      handleTaskEdit={handleEditTask}
                      handleTaskDelete={handleDeleteTask}
                      handleTaskDeleteUndo={handleTaskDeleteUndo}
                    />
                    <SectionSeparator />
                  </>
                );
              })}
            </>
          )}
          {tomorrowTasks.length !== 0 && (
            <>
              <SectionHeading text={'Tomorrow'} />
              <SectionSeparator />
              {tomorrowTasks.map((task) => {
                return (
                  <>
                    <TaskCardContainer
                      key={task.id}
                      task={task}
                      handleCheckboxChange={handleCheckboxChange}
                      handleTaskEdit={handleEditTask}
                      handleTaskDelete={handleDeleteTask}
                      handleTaskDeleteUndo={handleTaskDeleteUndo}
                    />
                    <SectionSeparator />
                  </>
                );
              })}
            </>
          )}
          {weekTasks.length !== 0 && (
            <>
              <SectionHeading text={'This week'} />
              <SectionSeparator />
              {weekTasks.map((task) => {
                return (
                  <>
                    <TaskCardContainer
                      key={task.id}
                      task={task}
                      handleCheckboxChange={handleCheckboxChange}
                      handleTaskEdit={handleEditTask}
                      handleTaskDelete={handleDeleteTask}
                      handleTaskDeleteUndo={handleTaskDeleteUndo}
                    />
                    <SectionSeparator />
                  </>
                );
              })}
            </>
          )}
          {Object.keys(monthTasks).length !== 0 && (
            <>
              {Object.entries(monthTasks).map(([month, tasks]) => (
                <div key={month} className="flex flex-col gap-4 w-full">
                  <SectionHeading
                    text={new Date(new Date().getFullYear(), parseInt(month, 10) - 1, 1).toLocaleString(
                      'en-US',
                      {
                        month: 'long',
                      }
                    )}
                  />
                  <SectionSeparator />
                  {tasks.map((task) => {
                    return (
                      <>
                        <TaskCardContainer
                          key={task.id}
                          task={task}
                          handleCheckboxChange={handleCheckboxChange}
                          handleTaskEdit={handleEditTask}
                          handleTaskDelete={handleDeleteTask}
                          handleTaskDeleteUndo={handleTaskDeleteUndo}
                        />
                        <SectionSeparator />
                      </>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
