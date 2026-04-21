import { PomodoroDTO } from "../models/pomodoro-dto";
import { apiClient } from "./api/client";

export const fetchPomodoroSettings = async (): Promise<PomodoroDTO> => {
  return await apiClient.get<PomodoroDTO>("/pomodoro");
};

export const updatePomodoroSetting = async (payload: PomodoroDTO): Promise<boolean> => {
  return await apiClient.put<boolean>("/pomodoro", payload);
};
