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
  intervalId: ReturnType<typeof setInterval> | null;

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

  clearPreviousTimer: () => void;
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
    get().clearPreviousTimer();
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
