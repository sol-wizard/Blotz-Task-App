import { create } from "zustand";

export type SheetKey = "taskDetail" | "editTask";

export type SheetStackItem =
  | { key: "taskDetail"; taskId: string | number }
  | { key: "editTask"; taskId: string | number };

type RouterState = {
  stack: SheetStackItem[];
  top: SheetStackItem | null;
  push: (item: SheetStackItem) => void;
  pop: () => void;
  replaceTop: (item: SheetStackItem) => void;
};

export const useSheetRouter = create<RouterState>((set, get) => ({
  stack: [],
  top: null,

  push: (item) => {
    const next = [...get().stack, item];
    set({ stack: next, top: next[next.length - 1] });
  },

  pop: () => {
    const cur = get().stack;
    if (cur.length === 0) return;
    const next = cur.slice(0, -1);
    set({ stack: next, top: next.length ? next[next.length - 1] : null });
  },

  replaceTop: (item) => {
    const cur = get().stack;
    if (cur.length === 0) {
      set({ stack: [item], top: item });
    } else {
      const next = [...cur.slice(0, -1), item];
      set({ stack: next, top: item });
    }
  },

  clear: () => set({ stack: [], top: null }),
}));

// 便捷选择器（可选）
export const selectTopKey = (s: RouterState) => s.top?.key ?? null;
export const selectTopTaskId = (s: RouterState) => s.top?.taskId;
