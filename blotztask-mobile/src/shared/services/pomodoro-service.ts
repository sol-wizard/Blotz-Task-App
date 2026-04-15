import { PomodoroDTO } from "../models/pomodoro-dto";
import { apiClient } from "./api/client";
import { UpdatePomodoroSettingRequest } from "@/feature/calendar/models/pomodoro-setting";

export const fetchPomodoroSettings = async (): Promise<PomodoroDTO> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/pomodoro`;
  return await apiClient.get<PomodoroDTO>(url);
};

export const updatePomodoroSetting = async (
  payload: UpdatePomodoroSettingRequest,
): Promise<boolean> => {
  return await apiClient.put<boolean>("/Pomodoro", payload);
};
