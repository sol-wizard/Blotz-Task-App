import { fetchAllTaskItems } from '@/services/taskService';
import { TaskDetailDTO } from '../task-list/models/task-detail-dto';
import { create } from 'zustand';

type ScheduleTaskStore = {
  allTasks: TaskDetailDTO[];
  loadAllTasks: () => Promise<void>;
};

export const useScheduleTaskStore = create<ScheduleTaskStore>((set, get) => ({
  allTasks: [],

  loadAllTasks: async () => {
    const data = await fetchAllTaskItems();
    set({ allTasks: data });
  },
}));
