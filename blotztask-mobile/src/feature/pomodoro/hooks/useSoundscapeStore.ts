import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { create } from "zustand";
import { PomodoroSoundscapeKey, SOUNDSCAPE_MUSIC_MAP } from "../utils/pomodoro-setting";
import { getI18n } from "react-i18next";

let globalPlayer: AudioPlayer | null = null;
let soundscapeKey: PomodoroSoundscapeKey | null = null;

interface SoundscapeState {
  isPlaying: boolean;
  initPlayer: () => Promise<void>;
  playSoundscape: (key: PomodoroSoundscapeKey) => Promise<void>;
  toggleSoundscape: () => void;
  pauseSoundscape: () => void;
  stopSoundscape: () => void;
}

export const useSoundscapeStore = create<SoundscapeState>((set, get) => ({
  isPlaying: false,

  initPlayer: async () => {
    if (globalPlayer) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });

    globalPlayer = createAudioPlayer(null);
  },

  playSoundscape: async (key) => {
    if (key === "noSound") {
      get().stopSoundscape();
      soundscapeKey = null;
      return;
    }
    if (!globalPlayer) return;

    const source = SOUNDSCAPE_MUSIC_MAP[key];
    if (!source) return;

    if (soundscapeKey !== key) {
      globalPlayer.replace(source);
      globalPlayer.loop = true;
      soundscapeKey = key;
    }

    globalPlayer.play();
    set({ isPlaying: true });
  },

  toggleSoundscape: () => {
    if (!globalPlayer) return;
    if (get().isPlaying) {
      get().pauseSoundscape();
      return;
    }
    get().playSoundscape(soundscapeKey!);
    set({ isPlaying: true });
  },

  pauseSoundscape: () => {
    if (!globalPlayer) return;
    globalPlayer.pause();
    set({ isPlaying: false });
  },

  stopSoundscape: () => {
    if (!globalPlayer) return;
    get().pauseSoundscape();
    globalPlayer.seekTo(0);
    soundscapeKey = null;
  },
}));
