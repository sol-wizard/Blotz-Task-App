import { ASSETS } from "@/shared/constants/assets";

export const ITEM_WIDTH = 80;
export const ITEM_GAP = 12;
export const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;

export const SOUNDSCAPES_DATA = [
  { key: "easyFocus", imageUrl: ASSETS.pomodoroSoundEasyFocus, music: ASSETS.pomodoroEasyFocus },
  { key: "deepWork", imageUrl: ASSETS.pomodoroSoundDeepWork, music: ASSETS.pomodoroDeepWork },
  { key: "taskFlow", imageUrl: ASSETS.pomodoroSoundTaskFlow, music: ASSETS.pomodoroTaskFlow },
  { key: "calmMind", imageUrl: ASSETS.pomodoroSoundCalmMind, music: ASSETS.pomodoroCalmMind },
  { key: "cafeVibe", imageUrl: ASSETS.pomodoroSoundCafeVibe, music: ASSETS.pomodoroCafeVibe },
  { key: "noSound", imageUrl: ASSETS.pomodoroSoundNoSound, music: null },
] as const;

export type PomodoroSoundscapeKey = (typeof SOUNDSCAPES_DATA)[number]["key"];

export const SOUNDSCAPE_IMAGE_MAP = Object.fromEntries(
  SOUNDSCAPES_DATA.map((item) => [item.key, item.imageUrl]),
) as Record<PomodoroSoundscapeKey, any>;

export const SOUNDSCAPE_MUSIC_MAP = Object.fromEntries(
  SOUNDSCAPES_DATA.map((item) => [item.key, item.music]),
) as Record<PomodoroSoundscapeKey, any>;
