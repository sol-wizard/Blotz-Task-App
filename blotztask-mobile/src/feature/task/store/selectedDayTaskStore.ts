import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { isSameDay } from "date-fns";
import { create } from "zustand";
import {
  addTaskItem,
  deleteTask,
  fetchTasksForDate,
  toggleTaskCompletion,
} from "../services/task-service";
import { AddTaskItemDTO } from "../models/add-task-item-dto";

interface SelectedDayTaskStore {
  selectedDay: Date;
  tasksForSelectedDay: TaskDetailDTO[];
  isLoading: boolean;
  setSelectedDay: (day: Date) => void;
  loadTasks: () => Promise<void>;
  addTask: (task: AddTaskItemDTO) => Promise<void>;
  toggleTask: (taskId: number) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
}
export const useSelectedDayTaskStore = create<SelectedDayTaskStore>((set, get) => ({
  selectedDay: new Date(),
  tasksForSelectedDay: [],
  isLoading: false,

  setSelectedDay: (day) => set({ selectedDay: day }),

  loadTasks: async () => {
    const { selectedDay } = get();
    console.log(`selectedDay: ${selectedDay}`);
    set({ isLoading: true });
    try {
      const isToday = isSameDay(selectedDay, new Date());
      const tasks = await fetchTasksForDate(selectedDay, isToday);
      console.log("Selected day tasks: ", tasks);
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
    await get().loadTasks(); // reload after toggle
  },

  removeTask: async (taskId) => {
    await deleteTask(taskId);
    set((state) => ({
      tasksForSelectedDay: state.tasksForSelectedDay.filter((t) => t.id !== taskId),
    }));
  },
}));
