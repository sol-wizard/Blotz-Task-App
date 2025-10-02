import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { create } from "zustand";
import { isSameDay } from "date-fns";
import {
  addTaskItem,
  deleteTask,
  fetchOverdueTasks,
  fetchTasksForDate,
  toggleTaskCompletion,
} from "../services/task-service";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";

interface SelectedDayTaskStore {
  selectedDay: Date;
  tasksForSelectedDay: TaskDetailDTO[];
  isLoading: boolean;
  setSelectedDay: (day: Date) => void;
  loadTasks: () => Promise<void>;
  addTask: (task: AddTaskItemDTO) => Promise<void>;
  toggleTask: (taskId: number) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
  overdueTasks: TaskDetailDTO[];
}

export const useSelectedDayTaskStore = create<SelectedDayTaskStore>((set, get) => ({
  selectedDay: new Date(),
  tasksForSelectedDay: [],
  overdueTasks: [],
  isLoading: false,
  setSelectedDay: (day) => set({ selectedDay: day }),

  loadTasks: async () => {
    const { selectedDay } = get();
    set({ isLoading: true });
    try {
      const isToday = isSameDay(selectedDay, new Date());
      const tasks = await fetchTasksForDate(selectedDay, isToday);
      const overdueTasks = await fetchOverdueTasks();
      set({ overdueTasks: overdueTasks });
      set({ tasksForSelectedDay: tasks });
    } catch (e) {
      console.error(e);
      set({ tasksForSelectedDay: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    try {
      await addTaskItem(task);
      await get().loadTasks();
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    }
  },

  toggleTask: async (taskId) => {
    await toggleTaskCompletion(taskId);
    await get().loadTasks();
  },

  removeTask: async (taskId) => {
    await deleteTask(taskId);
    await get().loadTasks();
  },
}));
