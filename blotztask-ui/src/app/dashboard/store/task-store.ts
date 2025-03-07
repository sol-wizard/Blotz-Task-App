import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { fetchTaskItemsDueToday } from '@/services/taskService';

type TaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTasks: TaskDetailDTO[];
  completedTasks: TaskDetailDTO[];
  loadTasks: () => Promise<void>;
  loading: boolean;
  setLoading: (value: boolean) => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  todayTasks: [],
  incompleteTasks: [],
  completedTasks: [],
  loading: false,

  setLoading: (value) => set({ loading: value }),

  loadTasks: async () => {
    set({ loading: true });
    try {
      const data = await fetchTaskItemsDueToday();
      set({
        todayTasks: data,
        incompleteTasks: data.filter((task) => !task.isDone),
        completedTasks: data.filter((task) => task.isDone),
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
