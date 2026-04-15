import { apiClient } from "./api/client";
import { UpdatePomodoroSettingRequest } from "@/feature/calendar/models/pomodoro-setting";

export const updatePomodoroSetting = async (
  payload: UpdatePomodoroSettingRequest,
): Promise<boolean> => {
  return await apiClient.put<boolean>("/Pomodoro", payload);
};
