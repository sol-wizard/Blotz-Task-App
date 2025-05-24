import { create } from 'zustand';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import {
  addTaskItem,
  deleteTask,
  editTask,
  fetchOvedueTasks,
  fetchTaskItemsDueToday,
  undoDeleteTask,
  updateTaskStatus,
} from '@/services/task-service';
import { performTaskAndRefresh } from './shared/util';
import { RawAddTaskDTO } from '../../model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { useScheduleTaskStore } from '@/app/store/schedule-task-store';
import { subscribeWithSelector } from 'zustand/middleware';

type TodayTaskStore = {
  todayTasks: TaskDetailDTO[];
  overdueTasks: TaskDetailDTO[];
  incompleteTodayTasks: TaskDetailDTO[];
  completedTodayTasks: TaskDetailDTO[];
  todayTasksIsLoading: boolean;
  actions: {
    loadOverdueTasks: () => Promise<void>;
    loadTodayTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
    handleAddTask: (taskDetails: RawAddTaskDTO) => void;
    handleEditTask: (updatedTask: RawEditTaskDTO) => void;
    handleDeleteTask: (taskId: number) => void;
    handleTaskDeleteUndo: (taskId: number) => void;
    handleCheckboxChange: (taskId: number) => void;
  };
};

export const useTodayTaskStore = create<TodayTaskStore>()(subscribeWithSelector((set, get) => ({
  todayTasks: [],
  overdueTasks: [],
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

    loadOverdueTasks: async () => {
      const { setLoading } = get().actions;

      const overdueTasks = await performTaskAndRefresh(
        ()=> fetchOvedueTasks(),
        async () => {},
        setLoading
      )

      if (overdueTasks) {
        set({ overdueTasks: overdueTasks });
      }
    },

    handleAddTask: async (taskDetails: RawAddTaskDTO) => {
      const { loadTodayTasks, loadOverdueTasks, setLoading } = get().actions;
      await performTaskAndRefresh(
        () => addTaskItem(taskDetails),
        async () => {
          await loadTodayTasks();
          await loadOverdueTasks();
        },
        setLoading
      );
    },

    handleEditTask: async (updatedTask: RawEditTaskDTO) => {
      const { loadTodayTasks, loadOverdueTasks, setLoading } = get().actions;
      await performTaskAndRefresh(
        () => editTask(updatedTask),
        async () => {
          await loadTodayTasks();
          await loadOverdueTasks();
        },
        setLoading
      );
    },

    handleDeleteTask: async (taskId: number) => {
      const { loadTodayTasks, loadOverdueTasks, setLoading } = get().actions;
      await performTaskAndRefresh(
        () => deleteTask(taskId),
        async () => {
          await loadTodayTasks();
          await loadOverdueTasks();
        },
        setLoading
      );
    },

    handleTaskDeleteUndo: async (taskId: number) => {
      const { loadTodayTasks, loadOverdueTasks, setLoading } = get().actions;
      await performTaskAndRefresh(
        () => undoDeleteTask(taskId),
        async () => {
          await loadTodayTasks();
          await loadOverdueTasks();
        },
        setLoading
      );
    },

    handleCheckboxChange: async (taskId: number) => {
      const { loadTodayTasks, loadOverdueTasks, setLoading } = get().actions;
      await performTaskAndRefresh(
        () => updateTaskStatus(taskId),
        async () => {
          await loadTodayTasks();
          await loadOverdueTasks();
        },
        setLoading
      );
    },
  },
})));

export const useTodayTasks = () => useTodayTaskStore((state) => state.todayTasks);
export const useOverdueTasks = () => useTodayTaskStore((state) => state.overdueTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);

useTodayTaskStore.subscribe(
  state => [state.todayTasks, state.overdueTasks],
  () => {
    const { loadScheduleTasks } = useScheduleTaskStore.getState().actions;
    loadScheduleTasks();
  }
);
