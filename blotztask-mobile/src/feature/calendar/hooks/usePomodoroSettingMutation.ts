import { useMutation } from "@tanstack/react-query";
import { updatePomodoroSetting } from "@/shared/services/pomodoro-service";
import { UpdatePomodoroSettingRequest } from "../models/pomodoro-setting";

export function usePomodoroSettingMutation() {
  const mutation = useMutation({
    mutationKey: ["updatePomodoroSetting"],
    mutationFn: (payload: UpdatePomodoroSettingRequest) => updatePomodoroSetting(payload),
  });

  return {
    savePomodoroSetting: mutation.mutateAsync,
    isSavingPomodoroSetting: mutation.isPending,
  };
}
