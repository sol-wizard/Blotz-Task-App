import { create } from 'zustand';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { addTaskItem, fetchTaskItemsDueToday } from '@/services/task-service';
import { performTaskAndRefresh } from './util';
import { RawAddTaskDTO } from '../../../../model/raw-add-task-dto';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  todayTasksIsLoading: boolean;
  actions: {
    loadTodayTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
    handleAddTask: (taskDetails: RawAddTaskDTO) => void;
  };
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

    handleAddTask: async (taskDetails: RawAddTaskDTO) => {
      const { loadTodayTasks: loadTasks, setLoading } = get().actions;

      await performTaskAndRefresh(() => addTaskItem(taskDetails), loadTasks, setLoading);
    },
  },
}));

export const useTodayTasks = () => useTodayTaskStore((state) => state.todayTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);
