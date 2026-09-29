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

// Used when the server has no sound saved (new users) or one the app doesn't know.
export const DEFAULT_SOUNDSCAPE: PomodoroSoundscapeType = "streamWhisper";

export const isSoundscapeType = (value: unknown): value is PomodoroSoundscapeType =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(SOUNDSCAPES, value);

export const SOUNDSCAPE_OPTIONS = Object.entries(SOUNDSCAPES).map(([type, value]) => ({
  type: type as PomodoroSoundscapeType,
  imageUrl: value.imageUrl,
}));
