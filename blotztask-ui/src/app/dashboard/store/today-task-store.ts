import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { addTaskItem, fetchTaskItemsDueToday } from '@/services/taskService';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  todayTasksIsLoading: boolean;
  actions : {
    loadTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
    taskAction: (action: () => Promise<unknown>) => void;
    handleAddTask: (taskDetails: AddTaskItemDTO) => void;
  }
};

const useTodayTaskStore = create<TodayTaskStore>((set, get) => ({
  todayTasks: [],
  incompleteTodayTasks: [],
  completedTodayTasks: [],
  todayTasksIsLoading: false,
  actions: {
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
        await get().actions.loadTasks();
      } catch (error) {
        console.error('Error performing action:', error);
      }
    },

    handleAddTask: async (taskDetails: AddTaskItemDTO) => {
      const taskAction = get().actions.taskAction;
      await taskAction(() => addTaskItem(taskDetails));
    },
  }
}));

export const useTodayTasks = () => useTodayTaskStore((state) => state.todayTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);