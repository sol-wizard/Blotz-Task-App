import { create } from "zustand";

interface PomodoroSession {
  taskId: string;
  elapsedSeconds: number;
  isPaused: boolean;
}

interface PomodoroTimerState {
  session: PomodoroSession | null;

  getTimerData: (
    taskId: string,
    targetMinutes: number,
    isCountdown: boolean,
  ) => {
    displayTimeStr: string;
    isPaused: boolean;
    isFinished: boolean;
    elapsedSeconds: number;
  };

  startTimer: (taskId: string, initialElapsed?: number) => void;
  togglePause: () => void;
  stopTimer: () => void;
  _tick: () => void;
}

export const usePomodoroTimer = create<PomodoroTimerState>((set, get) => ({
  session: null,
  intervalId: null,

  clearPreviousTimer: () => {
    const { intervalId } = get();

    if (intervalId) {
      clearInterval(intervalId);
    }

    set({
      session: null,
      intervalId: null,
    });
  },

  startTimer: (taskId, initialElapsed = 0) => {
    const intervalId = setInterval(() => get()._tick(), 1000);

    set({
      session: { taskId, elapsedSeconds: initialElapsed, isPaused: false },
      intervalId,
    });
  },

  togglePause: () => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, isPaused: !session.isPaused } });
  },

  stopTimer: () => {
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
