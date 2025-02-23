'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addTaskItem,
  deleteTask,
  editTask,
  fetchTaskItemsDueToday,
  restoreTask,
} from '@/services/taskService';
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
  const [loading, setLoading] = useState(false);

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

  /** Helper function to handle API action ensure consistent behaviour and avoid duplicate code */
  const handleAction = async (action: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await action();
      await loadTasks();
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = async (taskId: number) => {
    handleAction(() => updateTaskStatus(taskId));
  };

  const handleAddTask = async (taskDetails: AddTaskItemDTO) => {
    handleAction(() => addTaskItem(taskDetails));
  };

  const handleTaskEdit = async (updatedTask) => {
    handleAction(() => editTask(updatedTask));
  };

  const handleTaskDelete = async (taskId: number) => {
    handleAction(() => deleteTask(taskId));
  };

  const handleUndo = async () => {
    console.log('Restore deleted Task');
  };

  return (
    <>
      <div className="ml-5 flex flex-col gap-12">
        <TodayHeader tasks={tasks} />
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-lg font-semibold">Loading...</p>
            </div>
          ) : (
            <>
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
                      handleUndo={handleUndo}
                    ></TaskCard>
                  ))
                ) : (
                  <p>No incomplete tasks for today!</p>
                )}
              </div>
              <div>
                <Divider text="Done" />
                <CompletedTaskViewer
                  completedTasks={completedTasks}
                  handleCompletedCheckboxChange={handleCheckboxChange}
                  handleTaskEdit={handleTaskEdit}
                  handleTaskDelete={handleTaskDelete}
                  handleUndo={handleUndo}
                ></CompletedTaskViewer>
                : (<p>No incomplete tasks for today!</p>)
              </div>
              <Divider text="Done" />
              <CompletedTaskViewer
                completedTasks={completedTasks}
                handleCompletedCheckboxChange={handleCheckboxChange}
                handleTaskEdit={handleTaskEdit}
                handleTaskDelete={handleTaskDelete}
                handleUndo={handleUndo}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
