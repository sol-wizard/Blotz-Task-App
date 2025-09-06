import { create } from "zustand";

type BottomSheetStore = {
  taskDetailOpen: boolean;
  openTaskDetail: () => void;
  closeTaskDetail: () => void;

  editTaskOpen: boolean;
  openEditTask: () => void;
  closeEditTask: () => void;
};

export const useBottomSheetStore = create<BottomSheetStore>((set) => ({
  taskDetailOpen: false,
  openTaskDetail: () => set({ taskDetailOpen: true }),
  closeTaskDetail: () => set({ taskDetailOpen: false }),

  editTaskOpen: false,
  openEditTask: () => set({ editTaskOpen: true }),
  closeEditTask: () => set({ editTaskOpen: false }),
}));
