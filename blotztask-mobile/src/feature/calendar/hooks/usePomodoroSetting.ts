import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchPomodoroSettings, updatePomodoroSetting } from "@/shared/services/pomodoro-service";
import { PomodoroSoundscapeKey } from "../models/pomodoro-setting";
import { PomodoroDTO } from "@/shared/models/pomodoro-dto";
import { queryClient } from "@/shared/util/queryClient";
import { pomodoroKeys } from "@/shared/constants/query-key-factory";

export interface PomodoroSettingResponse {
  timing: number;
  sound: PomodoroSoundscapeKey | null;
  isCountdown: boolean;
}

export const usePomodoroSettingsQuery = () => {
  return useQuery<PomodoroDTO>({
    queryKey: pomodoroKeys.settings(),
    queryFn: fetchPomodoroSettings,
  });
};

export function usePomodoroSettingMutation() {
  const mutation = useMutation({
    mutationKey: ["updatePomodoroSetting"],
    mutationFn: (payload: PomodoroDTO) => updatePomodoroSetting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.all });
    },
  });

  return {
    updatePomodoroSetting: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
