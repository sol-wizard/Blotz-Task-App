import { PomodoroSoundscapeKey } from "@/feature/pomodoro/utils/pomodoro-setting";

export interface PomodoroDTO {
  timing: number;
  sound: PomodoroSoundscapeKey;
  isCountdown: boolean;
}
