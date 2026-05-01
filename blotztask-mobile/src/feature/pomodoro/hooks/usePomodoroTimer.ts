import { create } from "zustand";

interface PomodoroSession {
  taskId: string;
  elapsedSeconds: number;
  isPaused: boolean;
}

interface PomodoroTimerState {
  session: PomodoroSession | null;
  startTimer: (taskId: string, initialElapsed?: number) => void;
  togglePause: () => void;
  stopTimer: () => void;
  _tick: () => void;
}

let globalInterval: ReturnType<typeof setInterval> | null = null;

export const usePomodoroTimer = create<PomodoroTimerState>((set, get) => ({
  session: null,

  startTimer: (taskId, initialElapsed = 0) => {
    set({
      session: { taskId, elapsedSeconds: initialElapsed, isPaused: false },
    });

    if (globalInterval) {
      clearInterval(globalInterval);
      globalInterval = null;
    }

    globalInterval = setInterval(() => get()._tick(), 1000);
  },

  togglePause: () => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, isPaused: !session.isPaused } });
  },

  stopTimer: () => {
    if (globalInterval) {
      clearInterval(globalInterval);
      globalInterval = null;
    }
    set({ session: null });
  },

  _tick: () => {
    const { session } = get();
    if (session && !session.isPaused) {
      set({
        session: { ...session, elapsedSeconds: session.elapsedSeconds + 1 },
      });
    }
  },
}));
