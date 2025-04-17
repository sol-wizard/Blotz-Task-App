import { create } from 'zustand';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { addTaskItem, fetchTaskItemsDueToday } from '@/services/task-service';
import { performTaskAndRefresh } from './util';
import { RawAddTaskDTO } from '../../../../model/raw-add-task-dto';

// Mock overdue tasks for demonstration since backend is not ready
const mockOverdueTasks: TaskDetailDTO[] = [
  {
    id: -1,
    title: "Overdue Task 1",
    description: "This task is overdue",
    isDone: false,
    label: {
      labelId: 1,
      name: "Work",
      color: "#FF4444"
    },
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)) // 2 days ago
  },
  {
    id: -2,
    title: "Overdue Task 2",
    description: "Another overdue task",
    isDone: false,
    label: {
      labelId: 2,
      name: "Personal",
      color: "#4444FF"
    },
    dueDate: new Date(new Date().setHours(new Date().getHours() - 5)) // 5 hours ago
  }
];


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
        // Append mockOverdueTasks to the fetched data
        const allTasks = [...mockOverdueTasks, ...data];
        set({
          todayTasks: allTasks,
          incompleteTodayTasks: allTasks.filter((task) => !task.isDone),
          completedTodayTasks: allTasks.filter((task) => task.isDone),
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
