import { TaskDetailDTO } from '../task-list/models/task-detail-dto';
import { create } from 'zustand';
import { fetchScheduleTasks } from '@/services/task-service';

type ScheduleTaskStore = {
  overdueTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[];
  tomorrowTasks: TaskDetailDTO[];
  weekTasks: TaskDetailDTO[];
  monthTasks: Record<number, TaskDetailDTO[]>;
  actions: {
    loadScheduleTasks: () => Promise<void>;
  }
};

export const useScheduleTaskStore = create<ScheduleTaskStore>((set) => ({
  overdueTasks: [],
  todayTasks: [],
  tomorrowTasks: [],
  weekTasks: [],
  monthTasks: {},
  actions: {
    loadScheduleTasks: async () => {

      try {
        const scheduleTaskStore = await fetchScheduleTasks();
        set({ overdueTasks: scheduleTaskStore.overdueTasks });
        set({ todayTasks: scheduleTaskStore.todayTasks });
        set({ tomorrowTasks: scheduleTaskStore.tomorrowTasks });
        set({ weekTasks: scheduleTaskStore.weekTasks });
        set({ monthTasks: scheduleTaskStore.monthTasks});
      } catch (error) {
        console.log('Error schedule tasks: ', error);
      }

    },
  }
}));

export const useScheduleTaskActions = () => useScheduleTaskStore((state) => state.actions);