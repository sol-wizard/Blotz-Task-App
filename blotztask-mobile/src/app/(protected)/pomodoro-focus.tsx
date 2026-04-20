import { router } from "expo-router";
import { PomodoroFocus } from "@/feature/pomodoro/components/pomodoro-focus";
import { usePomodoroSettingsQuery } from "@/feature/pomodoro/hooks/usePomodoroSetting";

export default function PomodoroFocusPage() {
  const { data: pomodoroSetting } = usePomodoroSettingsQuery();

  if (!pomodoroSetting) return null;

  return (
    <PomodoroFocus
      onClose={() => router.back()}
      selectedSoundscape={pomodoroSetting.sound}
      selectedDuration={pomodoroSetting.timing}
      selectedCountdown={pomodoroSetting.isCountdown}
    />
  );
}
