import { ASSETS } from "@/shared/constants/assets";

export const ITEM_WIDTH = 80;
export const ITEM_GAP = 12;
export const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;

export const SOUNDSCAPES = {
  easyFocus: {
    imageUrl: ASSETS.pomodoroSoundEasyFocus,
    music: ASSETS.pomodoroEasyFocus,
  },
  deepWork: {
    imageUrl: ASSETS.pomodoroSoundDeepWork,
    music: ASSETS.pomodoroDeepWork,
  },
  taskFlow: {
    imageUrl: ASSETS.pomodoroSoundTaskFlow,
    music: ASSETS.pomodoroTaskFlow,
  },
  calmMind: {
    imageUrl: ASSETS.pomodoroSoundCalmMind,
    music: ASSETS.pomodoroCalmMind,
  },
  cafeVibe: {
    imageUrl: ASSETS.pomodoroSoundCafeVibe,
    music: ASSETS.pomodoroCafeVibe,
  },
  noSound: {
    imageUrl: ASSETS.pomodoroSoundNoSound,
    music: null,
  },
} as const;

export type PomodoroSoundscapeType = keyof typeof SOUNDSCAPES;

export const SOUNDSCAPE_OPTIONS = Object.entries(SOUNDSCAPES).map(([type, value]) => ({
  type: type as PomodoroSoundscapeType,
  imageUrl: value.imageUrl,
}));
