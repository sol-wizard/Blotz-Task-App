'use client';
import { useEffect } from 'react';
import { useScheduleTaskActions, useScheduleTaskStore } from '../../store/schedule-task-store';
import AddTaskCardContainer from '../today/components/container/add-task-card-container';
import ScheduleHeader from './components/schedule-header';
import TaskCardContainer from '../today/components/container/task-card-container';
import SectionSeparator from './components/section-separator';
import SecondHeader2 from './components/secondheader2';
import SecondHeader1 from './components/secondheader1';

export default function Schedule() {
  const { overdueTasks, todayTasks, tomorrowTasks, weekTasks, monthTasks } = useScheduleTaskStore();
  const { loadScheduleTasks } = useScheduleTaskStore((state) => state.actions);
  const { handleAddTask, handleEditTask, handleDeleteTask, handleTaskDeleteUndo, handleCheckboxChange } =
    useScheduleTaskActions();

  useEffect(() => {
    loadScheduleTasks();
  }, []);

  return (
    <div>
      <ScheduleHeader />

      <AddTaskCardContainer onAddTask={handleAddTask} />

      <div>
        {overdueTasks.length !== 0 && (
          <div>
            <SecondHeader2 text="overdue" />

            <SectionSeparator />
            {overdueTasks.map((task) => {
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
        )}
      </div>

      <div>
        {todayTasks.length !== 0 && (
          <div>
            <SecondHeader1 text={'Today'} />
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
          </div>
        )}
      </div>

      <div>
        {tomorrowTasks.length !== 0 && (
          <div>
            <SecondHeader2 text={'Tomorrow'} />
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
          </div>
        )}
      </div>

      <div>
        {weekTasks.length !== 0 && (
          <div>
            <SecondHeader2 text={'This week'} />
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
          </div>
        )}
      </div>

      <div>
        {Object.keys(monthTasks).length !== 0 && (
          <div>
            {Object.entries(monthTasks).map(([month, tasks]) => (
              <div key={month}>
                <SecondHeader2
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
          </div>
        )}
      </div>
    </div>
  );
}
