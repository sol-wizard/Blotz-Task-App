import { TaskDetailDTO } from '../task-list/models/task-detail-dto';
import { create } from 'zustand';
import { fetchScheduleTasks } from '@/services/task-service';

type ScheduleTaskStore = {
  allTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[];
  tomorrowTasks: TaskDetailDTO[];
  weekTasks: TaskDetailDTO[];
  monthTasks: TaskDetailDTO[];
  actions: {
    loadScheduleTasks: () => Promise<void>;
  }
};

export const useScheduleTaskStore = create<ScheduleTaskStore>((set) => ({
  allTasks: [],
  todayTasks: [],
  tomorrowTasks: [],
  weekTasks: [],
  monthTasks: [],

  actions: {
    loadScheduleTasks: async () => {

      // const data = await fetchAllTaskItems();
      // const today = startOfDay(new Date());
      // const tomorrow = addDays(today, 1);
      // set({ allTasks: data.filter((task) => !task.isDone) });

      try {
        const scheduleTaskStore = await fetchScheduleTasks();
        set({ todayTasks: scheduleTaskStore.todayTasks });
        set({ tomorrowTasks: scheduleTaskStore.tomorrowTasks });
        set({ weekTasks: scheduleTaskStore.weekTasks });
        set({ monthTasks: scheduleTaskStore.monthTasks });
      } catch (error) {
        console.log('Error schedule tasks: ', error);
      }
      // const { allTasks } = get();
      // set({ todayTasks: allTasks.filter((task) => isSameDay(new Date(task.dueDate), today)) });
      // set({ tomorrowTasks: allTasks.filter((task) => isSameDay(new Date(task.dueDate), tomorrow)) });
      // set({
      //   weekTasks: allTasks.filter((task) => {
      //     const dueDate = new Date(task.dueDate);
      //     return (
      //       isThisWeek(dueDate, { weekStartsOn: 1 }) &&
      //       !isSameDay(dueDate, today) &&
      //       !isSameDay(dueDate, tomorrow)
      //     );
      //   }),
      // });
      // set({
      //   monthTasks: allTasks.filter((task) => {
      //     const dueDate = new Date(task.dueDate);
      //     return (
      //       isThisMonth(dueDate) &&
      //       !isSameDay(dueDate, today) &&
      //       !isSameDay(dueDate, tomorrow) &&
      //       !isThisWeek(dueDate, { weekStartsOn: 1 })
      //     );
      //   }),
      // });
    },
  }
}));

export const useScheduleTaskActions = () => useScheduleTaskStore((state) => state.actions);