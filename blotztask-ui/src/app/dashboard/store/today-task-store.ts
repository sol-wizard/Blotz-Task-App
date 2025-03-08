import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { fetchTaskItemsDueToday } from '@/services/taskService';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  loadTasks: () => Promise<void>;
  todayTasksIsLoading: boolean;
  setLoading: (value: boolean) => void;
};

export const useTodayTaskStore = create<TodayTaskStore>((set) => ({
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
}));
