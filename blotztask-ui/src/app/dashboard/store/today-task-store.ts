import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { addTaskItem, fetchTaskItemsDueToday } from '@/services/taskService';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  loadTasks: () => Promise<void>;
  todayTasksIsLoading: boolean;
  setLoading: (value: boolean) => void;
  taskAction: (action: () => Promise<unknown>) => void;
  handleAddTask: (taskDetails: AddTaskItemDTO) => void;
};

export const useTodayTaskStore = create<TodayTaskStore>((set, get) => ({
  todayTasks: [],
  incompleteTodayTasks: [],
  completedTodayTasks: [],
  todayTasksIsLoading: false,

  setLoading: (value) => set({ todayTasksIsLoading: value }),

  loadTasks: async () => {
    set({ todayTasksIsLoading: true });
    try {
      const data = await fetchTaskItemsDueToday();
      set({
        todayTasks: data,
        incompleteTodayTasks: data.filter((task) => !task.isDone),
        completedTodayTasks: data.filter((task) => task.isDone),
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      set({ todayTasksIsLoading: false });
    }
  },

  taskAction: async (action: () => Promise<unknown>) => {
    try {
      await action();
      await get().loadTasks();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  },

  handleAddTask: async (taskDetails: AddTaskItemDTO) => {
    const taskAction = get().taskAction;
    await taskAction(() => addTaskItem(taskDetails));
  },
}));
