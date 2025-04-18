'use client';
import { useEffect } from 'react';
import { useScheduleTaskActions, useScheduleTaskStore } from '../../store/schedule-task-store';
import AddTaskCard from '../today/components/add-task-card';
import ScheduleHeader from './components/schedule-header';
import TaskCard from '../today/components/task-card';
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
      <p className="my-5" />
      <AddTaskCard onAddTask={handleAddTask} />
      <p className="my-5" />
      <div>
        {overdueTasks.length !== 0 && (
          <div>
            <p className="my-5">Overdue</p>

            {overdueTasks.map((task) => {
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleEditTask}
                  handleTaskDelete={handleDeleteTask}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        {todayTasks.length !== 0 && (
          <div>
            <SecondHeader1 text={"Today"}/>
            <p className="my-5">Today</p>

            {todayTasks.map((task) => {
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleEditTask}
                  handleTaskDelete={handleDeleteTask}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        {tomorrowTasks.length !== 0 && (
          <div>
            <SecondHeader2 text={"Tomorrow"} />
            <p className="my-5">Tomorrow</p>

            {tomorrowTasks.map((task) => {
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleEditTask}
                  handleTaskDelete={handleDeleteTask}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        {weekTasks.length !== 0 && (
          <div>
            <SecondHeader2 text={"This week"} />
            <p className="my-5">This Week</p>

            {weekTasks.map((task) => {
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleEditTask}
                  handleTaskDelete={handleDeleteTask}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        {Object.keys(monthTasks).length !== 0 && (
          <div>
            <SecondHeader2 text={"This month"} /> 
            {Object.entries(monthTasks).map(([month, tasks]) => (
              <div key={month}>
                <p className="my-5">
                  {new Date(new Date().getFullYear(), parseInt(month, 10) - 1, 1).toLocaleString('en-US', {
                    month: 'long',
                  })}
                </p>

                {tasks.map((task) => {
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      handleCheckboxChange={handleCheckboxChange}
                      handleTaskEdit={handleEditTask}
                      handleTaskDelete={handleDeleteTask}
                      handleTaskDeleteUndo={handleTaskDeleteUndo}
                    />
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
