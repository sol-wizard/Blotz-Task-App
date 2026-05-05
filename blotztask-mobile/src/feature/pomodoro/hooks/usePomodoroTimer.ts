import { create } from "zustand";
import { PomodoroSoundscapeKey } from "../utils/pomodoro-setting";
import { useSoundscapeStore } from "./useSoundscapeStore";

interface PomodoroSession {
  taskId: string;
  elapsedSeconds: number;
  isPaused: boolean;
  soundscape: PomodoroSoundscapeKey;
  isCountdown: boolean;
  durationSeconds: number;
}

interface PomodoroTimerState {
  session: PomodoroSession | null;
  startTimer: (
    taskId: string,
    soundscape: PomodoroSoundscapeKey,
    isCountdown: boolean,
    durationMinutes: number,
  ) => void;
  togglePause: () => void;
  stopTimer: () => void;
  setSoundscape: (key: PomodoroSoundscapeKey) => void;
  _tick: () => void;
}

let pomodoroClock: ReturnType<typeof setInterval> | null = null;

export const usePomodoroTimer = create<PomodoroTimerState>((set, get) => ({
  session: null,

  startTimer: (taskId, soundscape = "noSound", isCountdown: boolean, durationMinutes: number) => {
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
    void sound.initPlayer();
    void sound.playSoundscape(soundscape);
  },

  togglePause: () => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, isPaused: !session.isPaused } });

    const sound = useSoundscapeStore.getState();
    if (session.isPaused) {
      sound.resumeSoundscape();
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

  setSoundscape: (soundscape) => {
    const { session } = get();
    if (!session) return;

    set({ session: { ...session, soundscape } });

    if (session.isPaused) return;
    void useSoundscapeStore.getState().playSoundscape(soundscape);
  },

  _tick: () => {
    const { session } = get();
    if (session && !session.isPaused) {
      if (session.elapsedSeconds >= session.durationSeconds && session.isCountdown) {
        get().stopTimer();
        return;
      }
      set({
        session: { ...session, elapsedSeconds: session.elapsedSeconds + 1 },
      });
    }
  },
}));
