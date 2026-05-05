import { create } from "zustand";
import { PomodoroSoundscapeKey } from "../utils/pomodoro-setting";
import { useSoundscapeStore } from "./useSoundscapeStore";

interface PomodoroSession {
  taskId: string;
  elapsedSeconds: number;
  isPaused: boolean;
  soundscape: PomodoroSoundscapeKey;
}

interface PomodoroTimerState {
  session: PomodoroSession | null;
  startTimer: (taskId: string, soundscape: PomodoroSoundscapeKey) => void;
  togglePause: () => void;
  stopTimer: () => void;
  setSoundscape: (key: PomodoroSoundscapeKey) => void;
  _tick: () => void;
}

let pomodoroClock: ReturnType<typeof setInterval> | null = null;

export const usePomodoroTimer = create<PomodoroTimerState>((set, get) => ({
  session: null,

  startTimer: (taskId, soundscape = "noSound") => {
    if (pomodoroClock) {
      clearInterval(pomodoroClock);
      pomodoroClock = null;
    }
    set({ session: { taskId, elapsedSeconds: 0, isPaused: false, soundscape } });
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
      set({
        session: { ...session, elapsedSeconds: session.elapsedSeconds + 1 },
      });
    }
  },
}));
