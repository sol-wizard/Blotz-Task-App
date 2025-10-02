import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { create } from "zustand";

interface SelectedTaskStore {
  selectedTask: TaskDetailDTO | null;
  setSelectedTask: (task: TaskDetailDTO | null) => void;
  clearSelectedTask: () => void;
}

export const useSelectedTaskStore = create<SelectedTaskStore>((set) => ({
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),
  clearSelectedTask: () => set({ selectedTask: null }),
}));
