import { DEFAULT_SOUNDSCAPE, isSoundscapeType } from "@/feature/pomodoro/utils/pomodoro-setting";
import { PomodoroDTO, PomodoroSettingResponse } from "../models/pomodoro-dto";
import { apiClient } from "./api/client";

export const fetchPomodoroSettings = async (): Promise<PomodoroDTO> => {
  const setting = await apiClient.get<PomodoroSettingResponse>("/pomodoro");
  return {
    ...setting,
    sound: isSoundscapeType(setting.sound) ? setting.sound : DEFAULT_SOUNDSCAPE,
  };
};

export const updatePomodoroSetting = async (payload: PomodoroDTO): Promise<boolean> => {
  return await apiClient.put<boolean>("/pomodoro", payload);
};
