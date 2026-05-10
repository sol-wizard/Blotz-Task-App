import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { create } from "zustand";
import { PomodoroSoundscapeType, SOUNDSCAPES } from "../utils/pomodoro-setting";

let globalPlayer: AudioPlayer | null = null;
let playerInitPromise: Promise<AudioPlayer> | null = null;

async function initPlayer() {
  if (globalPlayer) return globalPlayer;

  playerInitPromise = (async () => {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
    globalPlayer = createAudioPlayer(null);
    return globalPlayer;
  })();

  return playerInitPromise;
}

interface SoundscapeState {
  isPlaying: boolean;
  currentSoundscapeType: PomodoroSoundscapeType | null;
  playSoundscape: (music: PomodoroSoundscapeType) => Promise<void>;
  toggleSoundscape: () => void;
  pauseSoundscape: () => void;
  stopSoundscape: () => void;
}

export const useSoundscapeStore = create<SoundscapeState>((set, get) => ({
  isPlaying: false,
  currentSoundscapeType: null,

  playSoundscape: async (type: PomodoroSoundscapeType) => {
    if (type === "noSound") {
      get().stopSoundscape();
      return;
    }
    const player = await initPlayer();

    const source = SOUNDSCAPES[type].music;
    if (!source) return;

    if (get().currentSoundscapeType !== type) {
      player.pause();
      player.replace(source);
      player.loop = true;
      set({ currentSoundscapeType: type });
    }

    player.play();
    set({ isPlaying: true });
  },

  toggleSoundscape: () => {
    if (!globalPlayer) return;
    if (get().isPlaying) {
      get().pauseSoundscape();
      return;
    }
    get().playSoundscape(get().currentSoundscapeType!);
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
    set({ currentSoundscapeType: null });
  },
}));
