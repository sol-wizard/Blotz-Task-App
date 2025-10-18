import { create } from "zustand";
import { TaskDetailDTO } from "../models/task-detail-dto";

interface SelectedTaskStore {
  selectedTask: TaskDetailDTO | null;
  setSelectedTask: (task: TaskDetailDTO | null) => void;
  clearSelectedTask: () => void;
}

const useSelectedTaskStoreInternal = create<SelectedTaskStore>((set) => ({
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),
  clearSelectedTask: () => set({ selectedTask: null }),
}));

// Expose state only
export const useSelectedTaskState = () =>
  useSelectedTaskStoreInternal((state) => state.selectedTask);

// Expose actions only
export const useSelectedTaskActions = () => {
  const setSelectedTask = useSelectedTaskStoreInternal((state) => state.setSelectedTask);
  const clearSelectedTask = useSelectedTaskStoreInternal((state) => state.clearSelectedTask);
  return { setSelectedTask, clearSelectedTask };
};
