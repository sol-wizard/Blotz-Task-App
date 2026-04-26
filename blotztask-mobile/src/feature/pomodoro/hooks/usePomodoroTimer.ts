import { calculateTimerState } from "../utils/calculateTimerState";
import { formatDuration } from "../utils/format-duration";
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

  getTimerData: (taskId, targetMinutes, isCountdown) => {
    const { session } = get();
    if (!session || session.taskId !== taskId) {
      return {
        displayTimeStr: isCountdown ? formatDuration(targetMinutes * 60) : "00:00",
        isPaused: true,
        isFinished: false,
        elapsedSeconds: 0,
      };
    }
    const elapsed = session?.elapsedSeconds || 0;
    const targetSeconds = targetMinutes * 60;

    const { displaySeconds, isFinished } = calculateTimerState(elapsed, targetSeconds, isCountdown);

    return {
      displayTimeStr: formatDuration(displaySeconds),
      isPaused: session?.isPaused ?? true,
      isFinished,
      elapsedSeconds: elapsed,
    };
  },
}));
