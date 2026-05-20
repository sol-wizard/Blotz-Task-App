import { ASSETS } from "@/shared/constants/assets";

export const ITEM_WIDTH = 80;
export const ITEM_GAP = 12;
export const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;

export const SOUNDSCAPES = {
  streamWhisper: {
    imageUrl: ASSETS.pomodoroImgStreamWhisper,
    music: ASSETS.pomodoroStreamWhisper,
  },
  pineFocus: {
    imageUrl: ASSETS.pomodoroImgPineFocus,
    music: ASSETS.pomodoroPineFocus,
  },
  nightGlow: {
    imageUrl: ASSETS.pomodoroImgNightGlow,
    music: ASSETS.pomodoroNightGlow,
  },
  silentMind: {
    imageUrl: ASSETS.pomodoroImgSilentMind,
    music: ASSETS.pomodoroSilentMind,
  },
  cafeNook: {
    imageUrl: ASSETS.pomodoroImgCafeNook,
    music: ASSETS.pomodoroCafeNook,
  },
  noSound: {
    imageUrl: ASSETS.pomodoroImgNoSound,
    music: null,
  },
} as const;

export type PomodoroSoundscapeType = keyof typeof SOUNDSCAPES;

export const SOUNDSCAPE_OPTIONS = Object.entries(SOUNDSCAPES).map(([type, value]) => ({
  type: type as PomodoroSoundscapeType,
  imageUrl: value.imageUrl,
}));
