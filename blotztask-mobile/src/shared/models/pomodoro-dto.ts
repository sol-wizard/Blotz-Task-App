import { PomodoroSoundscapeKey } from "@/feature/calendar/models/pomodoro-setting";

export interface PomodoroDTO {
  timing: number;
  sound: PomodoroSoundscapeKey | null;
  isCountdown: boolean;
}

export type UpdatePomodoroSettingRequest = PomodoroDTO;
