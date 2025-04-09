import { create } from 'zustand';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { addTaskItem, fetchTaskItemsDueToday } from '@/services/task-service';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { performTaskAndRefresh } from './util';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  todayTasksIsLoading: boolean;
  actions : {
    loadTodayTasks: () => Promise<void>;
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

    loadTodayTasks: async () => {
      const { setLoading } = get().actions;
    
      const data = await performTaskAndRefresh(
        () => fetchTaskItemsDueToday(),
        async () => {}, // no-op reload since it's already loading
        setLoading
      );
    
      if (data) {
        set({
          todayTasks: data,
          incompleteTodayTasks: data.filter((task) => !task.isDone),
          completedTodayTasks: data.filter((task) => task.isDone),
        });
      }
    },
    
    handleAddTask: async (taskDetails: AddTaskItemDTO) => {
      const { loadTodayTasks: loadTasks, setLoading } = get().actions;

      await performTaskAndRefresh(() => addTaskItem(taskDetails), loadTasks, setLoading);
    },
  }
}));

export const useTodayTasks = () => useTodayTaskStore((state) => state.todayTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);