'use client';
import { useEffect } from 'react';
import { useScheduleTaskStore } from '../../store/schedule-task-store';
import AddTaskCard from '../today/components/add-task-card';
import ScheduleHeader from './components/schedule-header';
import TaskCard from '../today/components/task-card';
import { useTodayTaskActions } from '@/app/store/today-store/today-task-store';

export default function Schedule() {
  const { overdueTasks, todayTasks, tomorrowTasks, weekTasks, monthTasks } = useScheduleTaskStore();
  const { loadScheduleTasks } = useScheduleTaskStore((state) => state.actions);
  const { handleAddTask, handleEditTask, handleDeleteTask, handleTaskDeleteUndo, handleCheckboxChange } =
    useTodayTaskActions();

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
