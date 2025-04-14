import { create } from 'zustand';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import {
  addTaskItem,
  deleteTask,
  editTask,
  fetchTaskItemsDueToday,
  undoDeleteTask,
  updateTaskStatus,
} from '@/services/task-service';
import { performTaskAndRefresh } from './util';
import { RawAddTaskDTO } from '../../../model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  todayTasksIsLoading: boolean;
  actions: {
    loadTodayTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
    handleAddTask: (taskDetails: RawAddTaskDTO) => void;
    handleEditTask: (updatedTask: RawEditTaskDTO) => void;
    handleDeleteTask: (taskId: number) => void;
    handleTaskDeleteUndo: (taskId: number) => void;
    handleCheckboxChange: (taskId: number) => void;
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
      const { loadTodayTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => addTaskItem(taskDetails), loadTodayTasks, setLoading);
    },

    handleEditTask: async (updatedTask: RawEditTaskDTO) => {
      const { loadTodayTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => editTask(updatedTask), loadTodayTasks, setLoading);
    },

    handleDeleteTask: async (taskId: number) => {
      const { loadTodayTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => deleteTask(taskId), loadTodayTasks, setLoading);
    },

    handleTaskDeleteUndo: async (taskId: number) => {
      const { loadTodayTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => undoDeleteTask(taskId), loadTodayTasks, setLoading);
    },

    handleCheckboxChange: async (taskId: number) => {
      const { loadTodayTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => updateTaskStatus(taskId), loadTodayTasks, setLoading);
    },
  },
}));

export const useTodayTasks = () => useTodayTaskStore((state) => state.todayTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);
