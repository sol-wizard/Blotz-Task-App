import { PomodoroSoundscapeType } from "@/feature/pomodoro/utils/pomodoro-setting";

export interface PomodoroDTO {
  timing: number;
  sound: PomodoroSoundscapeType;
  isCountdown: boolean;
}
