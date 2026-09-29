import { PomodoroSoundscapeType } from "@/feature/pomodoro/utils/pomodoro-setting";

export interface PomodoroDTO {
  timing: number;
  sound: PomodoroSoundscapeType;
  isCountdown: boolean;
}

// What GET /pomodoro actually returns: Sound is null until the user picks one.
export interface PomodoroSettingResponse {
  timing: number;
  sound: string | null;
  isCountdown: boolean;
}
