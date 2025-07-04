'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { H1 } from '@/components/ui/heading-with-anchor';
import {
  deleteTask,
  editTask,
  fetchAllTaskItems,
  undoDeleteTask,
  updateTaskStatus,
} from '@/services/task-service';
import { TaskList } from './components/task-list';
import { TaskDetailDTO } from '../../../model/task-detail-dto';
import { useTodayTaskActions } from '../../store/today-task-store';
import { useScheduleTaskActions } from '@/app/store/schedule-task-store';

export default function Page() {
  const [taskList, setTaskList] = useState<TaskDetailDTO[]>([]);

  const { loadTodayTasks, loadOverdueTasks } = useTodayTaskActions();
  const { loadScheduleTasks } = useScheduleTaskActions();

  const loadTasks = async () => {
    const data = await fetchAllTaskItems();
    setTaskList(data);
  };

  const handleTaskToggle = async (taskId: number) => {
    try {
      await updateTaskStatus(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleTaskEdit = async (data) => {
    try {
      await editTask(data);
      await loadTasks();
    } catch (error) {
      console.error('Error editing task:', error);
    }
  };

  const handleTaskDelete = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleTaskDeleteUndo = async (taskId: number) => {
    try {
      await undoDeleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error restoring task:', error);
    }
  };

  useEffect(() => {
    loadTasks();
    loadTodayTasks();
    loadOverdueTasks();
    loadScheduleTasks();
  }, []);

  return (
    <div className="flex flex-col w-full items-end mt-5">
      <div className="text-primary-dark flex w-full justify-between mb-5">
        <H1>All Tasks</H1>
      </div>

      <TaskList
        tasks={taskList}
        handleCheckboxChange={handleTaskToggle}
        handleTaskEdit={handleTaskEdit}
        handleTaskDelete={handleTaskDelete}
        handleTaskDeleteUndo={handleTaskDeleteUndo}
      />
    </div>
  );
}
