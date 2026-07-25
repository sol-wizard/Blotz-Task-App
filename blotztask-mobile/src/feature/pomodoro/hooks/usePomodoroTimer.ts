import { create } from "zustand";
import { PomodoroSoundscapeType } from "../utils/pomodoro-setting";
import { useSoundscapeStore } from "./useSoundscapeStore";

interface PomodoroSession {
  taskId: string;
  elapsedSeconds: number;
  isPaused: boolean;
  soundscape: PomodoroSoundscapeType;
  isCountdown: boolean;
  durationSeconds: number;
}

interface PomodoroCompletion {
  taskId: string;
  completionId: number;
}

interface PomodoroTimerState {
  session: PomodoroSession | null;
  lastCompletion: PomodoroCompletion | null;
  startTimer: (
    taskId: string,
    soundscape: PomodoroSoundscapeType,
    isCountdown: boolean,
    durationMinutes: number,
  ) => Promise<void>;
  togglePause: () => void;
  stopTimer: () => void;
  _tick: () => void;
}

let pomodoroClock: ReturnType<typeof setInterval> | null = null;

export const usePomodoroTimer = create<PomodoroTimerState>((set, get) => ({
  session: null,
  lastCompletion: null,

  startTimer: async (taskId, soundscape, isCountdown, durationMinutes) => {
    if (pomodoroClock) {
      clearInterval(pomodoroClock);
      pomodoroClock = null;
    }
    set({
      session: {
        taskId,
        elapsedSeconds: 0,
        isPaused: false,
        soundscape,
        isCountdown,
        durationSeconds: durationMinutes * 60,
      },
    });
    pomodoroClock = setInterval(() => get()._tick(), 1000);
    const sound = useSoundscapeStore.getState();
    void sound.playSoundscape(soundscape);
  },

  togglePause: () => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, isPaused: !session.isPaused } });

    const sound = useSoundscapeStore.getState();
    if (session.isPaused) {
      sound.playSoundscape(session.soundscape);
    } else {
      sound.pauseSoundscape();
    }
  },

  stopTimer: () => {
    if (pomodoroClock) {
      clearInterval(pomodoroClock);
      pomodoroClock = null;
    }
    useSoundscapeStore.getState().stopSoundscape();
    set({ session: null });
  },

  _tick: () => {
    const { session } = get();
    if (session && !session.isPaused) {
      if (session.elapsedSeconds >= session.durationSeconds && session.isCountdown) {
        const { taskId } = session;
        get().stopTimer();
        set((state) => ({
          lastCompletion: {
            taskId,
            completionId: (state.lastCompletion?.completionId ?? 0) + 1,
          },
        }));
        return;
      }
      set({
        session: { ...session, elapsedSeconds: session.elapsedSeconds + 1 },
      });
    }
  },
}));
