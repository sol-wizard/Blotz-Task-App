'use client';

import { useEffect, useState } from 'react';
import { addTaskItem, deleteTask, editTask, fetchTaskItemsDueToday } from '@/services/taskService';
import { updateTaskStatus } from '@/services/taskService';
import TodayHeader from './components/today-header';
import TaskCard from './components/task-card';
import AddTaskCard from './components/add-task-card';
import { CompletedTaskViewer } from './components/completed-task-viewer';
import Divider from './components/divider';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';

export default function Today() {
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]); // Store all tasks here
  const [incompleteTasks, setIncompleteTasks] = useState<TaskDetailDTO[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskDetailDTO[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await fetchTaskItemsDueToday();
      setTasks(data);
      // Filter tasks to only include those where isDone is false
      const notDoneTasks = data.filter((task) => !task.isDone);
      setIncompleteTasks(notDoneTasks);
      const doneTask = data.filter((task) => task.isDone);
      setCompletedTasks(doneTask);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleCheckboxChange = async (taskId: number) => {
    await completeTask(taskId);
  };

  const handleCompletedCheckboxChange = async (taskId: number) => {
    await completeTask(taskId);
  };

  const completeTask = async (taskId: number) => {
    try {
      await updateTaskStatus(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleAddTask = async (taskDetails: AddTaskItemDTO) => {
    try {
      await addTaskItem(taskDetails);
      await loadTasks();
    } catch (error) {
      console.error('Error adding new task:', error);
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

  return (
    <>
      <div className="ml-5 flex flex-col gap-12">
        <TodayHeader tasks={tasks} />
        <div className="flex flex-col gap-6">
          <AddTaskCard onAddTask={(newTaskData) => handleAddTask(newTaskData)} />
          <Divider text="To do" />
          <div className="flex flex-col gap-6 w-full">
            {incompleteTasks.length > 0 ? (
              incompleteTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
                ></TaskCard>
              ))
            ) : (
              <p>No incomplete tasks for today!</p>
            )}
          </div>
          <Divider text="Done" />
          <CompletedTaskViewer
            completedTasks={completedTasks}
            handleCompletedCheckboxChange={handleCompletedCheckboxChange}
            handleTaskEdit={handleTaskEdit}
            handleTaskDelete={handleTaskDelete}
          />
        </div>
      </div>
    </>
  );
}
