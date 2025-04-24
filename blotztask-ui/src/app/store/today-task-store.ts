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
import { performTaskAndRefresh } from './shared/util';
import { RawAddTaskDTO } from '../../model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';

// Mock overdue tasks for demonstration since backend is not ready
const mockOverdueTasks: TaskDetailDTO[] = [
  {
    id: -1,
    title: 'Overdue Task 1',
    description: 'This task is overdue',
    isDone: false,
    label: {
      labelId: 1,
      name: 'Work',
      color: '#FF4444',
    },
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)), // 2 days ago
  },
  {
    id: -2,
    title: 'Overdue Task 2',
    description: 'Another overdue task',
    isDone: false,
    label: {
      labelId: 2,
      name: 'Personal',
      color: '#4444FF',
    },
    dueDate: new Date(new Date().setHours(new Date().getHours() - 5)), // 5 hours ago
  },
];

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

const useTodayTaskStore = create<TodayTaskStore>((set, get) => ({
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
      setLoading(true);
      try {
        // Simulate fetching overdue tasks
        set({ overdueTasks: mockOverdueTasks });
      } catch (error) {
        console.error('Failed to load overdue tasks:', error);
      } finally {
        setLoading(false);
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
export const useOverdueTasks = () => useTodayTaskStore((state) => state.overdueTasks);
export const useIncompleteTodayTasks = () => useTodayTaskStore((state) => state.incompleteTodayTasks);
export const useCompletedTodayTasks = () => useTodayTaskStore((state) => state.completedTodayTasks);
export const useTodayTasksIsLoading = () => useTodayTaskStore((state) => state.todayTasksIsLoading);
export const useTodayTaskActions = () => useTodayTaskStore((state) => state.actions);
