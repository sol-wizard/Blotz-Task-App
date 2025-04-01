import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { addTaskItem, fetchTaskItemsDueToday } from '@/services/taskService';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { performTaskAndRefresh } from './util';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  todayTasksIsLoading: boolean;
  actions : {
    loadTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
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
      try {
        const data = await fetchTaskItemsDueToday();
        set({
          todayTasks: data,
          incompleteTodayTasks: data.filter((task) => !task.isDone),
          completedTodayTasks: data.filter((task) => task.isDone),
        });
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    },
    
    handleAddTask: async (taskDetails: AddTaskItemDTO) => {
      const { loadTasks, setLoading } = get().actions;

      await performTaskAndRefresh(() => addTaskItem(taskDetails), loadTasks, setLoading);
    },
  }
}));

export const useTodayTasks = () => useTodayTaskStore((state) => state.todayTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);