'use client';

import { useEffect } from 'react';
import { addTaskItem, deleteTask, editTask, undoDeleteTask } from '@/services/taskService';
import { updateTaskStatus } from '@/services/taskService';
import TodayHeader from './components/today-header';
import TaskCard from './components/task-card';
import AddTaskCard from './components/add-task-card';
import { CompletedTaskViewer } from './components/completed-task-viewer';
import Divider from './components/divider';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import { EditTaskItemDTO } from '../task-list/models/edit-task-item-dto';
import { useTodayTaskStore } from '../store/today-task-store';

export default function Today() {
  const {
    todayTasks,
    incompleteTodayTasks,
    completedTodayTasks,
    todayTasksIsLoading,
    loadTasks,
    setLoading,
  } = useTodayTaskStore();

  useEffect(() => {
    loadTasks();
  }, []);

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

  const handleTaskEdit = async (updatedTask: EditTaskItemDTO) => {
    handleAction(() => editTask(updatedTask));
  };

  const handleTaskDelete = async (taskId: number) => {
    handleAction(() => deleteTask(taskId));
  };

  const handleTaskDeleteUndo = async (taskId: number) => {
    handleAction(() => undoDeleteTask(taskId));
  };

  return (
    <>
      <div className="ml-5 flex flex-col gap-12">
        <div className="flex flex-col gap-6">
          {todayTasksIsLoading ? (
            <div className="flex justify-center items-center min-h-screen">
              <div>
                <LoadingSpinner variant="blue" className="mb-12 ml-8 text-[10px]" />
                <p className="font-semibold text-zinc-600">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              <TodayHeader tasks={todayTasks} />
              <AddTaskCard onAddTask={(newTaskData) => handleAddTask(newTaskData)} />
              <Divider text="To do" />
              <div className="flex flex-col gap-6 w-full">
                {incompleteTodayTasks.length > 0 ? (
                  incompleteTodayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      handleCheckboxChange={handleCheckboxChange}
                      handleTaskEdit={handleTaskEdit}
                      handleTaskDelete={handleTaskDelete}
                      handleTaskDeleteUndo={handleTaskDeleteUndo}
                    ></TaskCard>
                  ))
                ) : (
                  <p>No incomplete tasks for today!</p>
                )}
              </div>
              <Divider text="Done" />
              <CompletedTaskViewer
                completedTasks={completedTodayTasks}
                handleCompletedCheckboxChange={handleCheckboxChange}
                handleTaskEdit={handleTaskEdit}
                handleTaskDelete={handleTaskDelete}
                handleTaskDeleteUndo={handleTaskDeleteUndo}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
