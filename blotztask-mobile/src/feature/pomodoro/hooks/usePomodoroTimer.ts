import { create } from "zustand";

interface PomodoroSession {
  taskId: string;
  elapsedSeconds: number;
  isPaused: boolean;
}

interface PomodoroTimerState {
  session: PomodoroSession | null;
  startTimer: (taskId: string) => void;
  togglePause: () => void;
  stopTimer: () => void;
  _tick: () => void;
}

let pomodoroClock: ReturnType<typeof setInterval> | null = null;

export const usePomodoroTimer = create<PomodoroTimerState>((set, get) => ({
  session: null,

  startTimer: (taskId) => {
    if (pomodoroClock) {
      clearInterval(pomodoroClock);
      pomodoroClock = null;
    }
    set({ session: { taskId, elapsedSeconds: 0, isPaused: false } });
    pomodoroClock = setInterval(() => get()._tick(), 1000);
  },

  togglePause: () => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, isPaused: !session.isPaused } });
  },

  stopTimer: () => {
    if (pomodoroClock) {
      clearInterval(pomodoroClock);
      pomodoroClock = null;
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
