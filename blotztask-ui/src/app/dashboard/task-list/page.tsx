'use client';

import { useRef, useState } from 'react';
import { useEffect } from 'react';
import { H1 } from '@/components/ui/heading-with-anchor';
import { deleteTask, editTask, fetchAllTaskItems, updateTaskStatus } from '@/services/taskService';
import { TaskList } from './components/task-list';
import { TaskDetailDTO } from './models/task-detail-dto';

export default function Page() {
  const [taskList, setTaskList] = useState<TaskDetailDTO[]>([]); // 改为 TaskDetailDTO
  const deletedTaskRef = useRef<TaskDetailDTO>();

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
      const taskToDelete = taskList.find((task) => task.id === taskId);
      console.log('handleTaskDelete-taskToDelete:', taskToDelete);
      deletedTaskRef.current = taskToDelete;
      await deleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleUndo = async () => {
    console.log('Restore deleted task!');
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div className="flex flex-col w-full items-end mt-5">
      <div className="text-primary-dark flex w-full justify-between">
        <H1>All Tasks</H1>
      </div>

      <TaskList
        tasks={taskList}
        handleCheckboxChange={handleTaskToggle}
        handleTaskEdit={handleTaskEdit}
        handleTaskDelete={handleTaskDelete}
        handleUndo={handleUndo}
      />
    </div>
  );
}
