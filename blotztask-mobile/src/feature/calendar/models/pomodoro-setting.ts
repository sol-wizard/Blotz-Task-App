export type PomodoroSoundscapeKey =
  | "easyFocus"
  | "deepWork"
  | "taskFlow"
  | "calmMind"
  | "cafeVibe"
  | "noSound";

export interface UpdatePomodoroSettingRequest {
  timing: number | null;
  sound: PomodoroSoundscapeKey | null;
}
