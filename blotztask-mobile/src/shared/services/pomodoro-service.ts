import { PomodoroSoundscapeType, SOUNDSCAPES } from "@/feature/pomodoro/utils/pomodoro-setting";
import { PomodoroDTO } from "../models/pomodoro-dto";
import { apiClient } from "./api/client";

// Users who never picked a sound have none saved (Sound = NULL), and a newer backend
// may send a sound this app version doesn't know. Both play the default.
const DEFAULT_SOUNDSCAPE: PomodoroSoundscapeType = "streamWhisper";

type PomodoroSettingResponse = Omit<PomodoroDTO, "sound"> & { sound: string | null };

const isSoundscapeType = (sound: string | null): sound is PomodoroSoundscapeType =>
  sound !== null && Object.keys(SOUNDSCAPES).includes(sound);

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
