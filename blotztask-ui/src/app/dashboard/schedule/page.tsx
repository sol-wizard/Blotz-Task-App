'use client';
import { useScheduleTaskStore } from '../store/schedule-task-store';
import AddTaskCard from '../today/components/add-task-card';
import ScheduleHeader from './components/schedule-header';

export default function Schedule() {
  const { allTasks } = useScheduleTaskStore();
  const handleAddTask = (task) => {
    console.log('Task added successfully!', task);
  };
  return (
    <div>
      <ScheduleHeader />
      <AddTaskCard onAddTask={handleAddTask} />
    </div>
  );
}
