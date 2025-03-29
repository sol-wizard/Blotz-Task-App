import { fetchAllTaskItems } from '@/services/taskService';
import { TaskDetailDTO } from '../task-list/models/task-detail-dto';
import { create } from 'zustand';
import { addDays, isSameDay, isThisMonth, isThisWeek, startOfDay } from 'date-fns';

type ScheduleTaskStore = {
  allTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[];
  tomorrowTasks: TaskDetailDTO[];
  weekTasks: TaskDetailDTO[];
  monthTasks: TaskDetailDTO[];
  loadAllTasks: () => Promise<void>;
};

export const useScheduleTaskStore = create<ScheduleTaskStore>((set, get) => ({
  allTasks: [],
  todayTasks: [],
  tomorrowTasks: [],
  weekTasks: [],
  monthTasks: [],

  loadAllTasks: async () => {
    const data = await fetchAllTaskItems();
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    set({ allTasks: data.filter((task) => !task.isDone) });
    const { allTasks } = get();
    set({ todayTasks: allTasks.filter((task) => isSameDay(new Date(task.dueDate), today)) });
    set({ tomorrowTasks: allTasks.filter((task) => isSameDay(new Date(task.dueDate), tomorrow)) });
    set({
      weekTasks: allTasks.filter((task) => {
        const dueDate = new Date(task.dueDate);
        return (
          isThisWeek(dueDate, { weekStartsOn: 1 }) &&
          !isSameDay(dueDate, today) &&
          !isSameDay(dueDate, tomorrow)
        );
      }),
    });
    set({
      monthTasks: allTasks.filter((task) => {
        const dueDate = new Date(task.dueDate);
        return (
          isThisMonth(dueDate) &&
          !isSameDay(dueDate, today) &&
          !isSameDay(dueDate, tomorrow) &&
          !isThisWeek(dueDate, { weekStartsOn: 1 })
        );
      }),
    });
  },
}));
