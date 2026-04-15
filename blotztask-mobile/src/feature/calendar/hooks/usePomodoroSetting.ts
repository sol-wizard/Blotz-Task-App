import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchPomodoroSettings, updatePomodoroSetting } from "@/shared/services/pomodoro-service";
import { PomodoroSoundscapeKey, UpdatePomodoroSettingRequest } from "../models/pomodoro-setting";
import type { PomodoroDTO } from "@/shared/models/pomodoro-dto";
import { queryClient } from "@/shared/util/queryClient";

export interface PomodoroSettingResponse {
  timing: number;
  sound: PomodoroSoundscapeKey | null;
  isCountdown: boolean;
}

export const usePomodoroSettingsQuery = () => {
  return useQuery<PomodoroDTO>({
    queryKey: ["pomodoroSettings"],
    queryFn: fetchPomodoroSettings,
  });
};

export function usePomodoroSettingMutation() {
  const mutation = useMutation({
    mutationKey: ["updatePomodoroSetting"],
    mutationFn: (payload: UpdatePomodoroSettingRequest) => updatePomodoroSetting(payload),
    onSuccess: () => {
      // Invalidate the query to refetch the updated settings
      queryClient.invalidateQueries({ queryKey: ["pomodoroSettings"] });
    },
  });

  return {
    savePomodoroSetting: mutation.mutateAsync,
  };
}
