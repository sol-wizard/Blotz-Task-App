'use client';
import { useEffect } from 'react';
import { useScheduleTaskStore } from '../store/schedule-task-store';
import AddTaskCard from '../today/components/add-task-card';
import ScheduleHeader from './components/schedule-header';
import TaskCard from '../today/components/task-card';
import { format } from 'date-fns';

export default function Schedule() {
  const { todayTasks, tomorrowTasks, weekTasks, monthTasks, loadAllTasks } = useScheduleTaskStore();

  useEffect(() => {
    loadAllTasks();
  }, []);

  const handleAddTask = (task) => {
    console.log('Task added successfully!', task);
  };

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
    <div>
      <ScheduleHeader />
      <AddTaskCard onAddTask={handleAddTask} />
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
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
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
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
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
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        {monthTasks.length !== 0 && (
          <div>
            <p className="my-5">{format(new Date(), 'MMMM')}</p>

            {monthTasks.map((task) => {
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
                  handleTaskDeleteUndo={handleTaskDeleteUndo}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
