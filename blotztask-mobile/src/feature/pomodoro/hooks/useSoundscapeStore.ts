import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { create } from "zustand";
import { PomodoroSoundscapeKey, SOUNDSCAPE_MUSIC_MAP } from "../utils/pomodoro-setting";

let globalPlayer: AudioPlayer | null = null;
let currentKey: PomodoroSoundscapeKey | null = null;
let initialized = false;

interface SoundscapeState {
  isPlaying: boolean;
  initPlayer: () => Promise<void>;
  playSoundscape: (key: PomodoroSoundscapeKey) => Promise<void>;
  toggleSoundscape: () => void;
  pauseSoundscape: () => void;
  resumeSoundscape: () => void;
  stopSoundscape: () => void;
}

export const useSoundscapeStore = create<SoundscapeState>((set, get) => ({
  isPlaying: false,

  initPlayer: async () => {
    if (initialized && globalPlayer) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });

    globalPlayer = createAudioPlayer(null);
    initialized = true;
  },

  playSoundscape: async (key) => {
    if (!initialized || !globalPlayer) {
      await get().initPlayer();
    }
    if (!globalPlayer) return;

    if (key === "noSound") {
      get().stopSoundscape();
      return;
    }

    const source = SOUNDSCAPE_MUSIC_MAP[key];
    if (!source) return;

    if (currentKey !== key) {
      globalPlayer.replace(source);
      globalPlayer.loop = true;
      currentKey = key;
    }

    globalPlayer.play();
    set({ isPlaying: true });
  },

  toggleSoundscape: () => {
    if (!globalPlayer) return;
    if (get().isPlaying) {
      globalPlayer.pause();
      set({ isPlaying: false });
      return;
    }
    get().playSoundscape(currentKey!);
    set({ isPlaying: true });
  },

  pauseSoundscape: () => {
    if (!globalPlayer) return;
    globalPlayer.pause();
    set({ isPlaying: false });
  },

  resumeSoundscape: () => {
    if (!globalPlayer) return;
    globalPlayer.play();
    set({ isPlaying: true });
  },

  stopSoundscape: () => {
    if (!globalPlayer) return;
    globalPlayer.pause();
    globalPlayer.seekTo(0);
    currentKey = null;
    set({ isPlaying: false });
  },
}));
