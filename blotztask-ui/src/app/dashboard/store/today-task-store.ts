import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { fetchTaskItemsDueToday } from '@/services/taskService';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  loadTasks: () => Promise<void>;
  loading: boolean;
  setLoading: (value: boolean) => void;
};

export const useTodayTaskStore = create<TodayTaskStore>((set) => ({
  todayTasks: [],
  incompleteTodayTasks: [],
  completedTodayTasks: [],
  loading: false,

  setLoading: (value) => set({ loading: value }),

  loadTasks: async () => {
    set({ loading: true });
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
      set({ loading: false });
    }
  },
}));
