import { router } from "expo-router";
import { PomodoroFocus } from "../components/pomodoro-focus";
import { usePomodoroSettingsQuery } from "../hooks/usePomodoroSetting";

export default function PomodoroFocusScreen() {
  const { data: pomodoroSetting } = usePomodoroSettingsQuery();

  if (!pomodoroSetting) return null;

  return (
    <PomodoroFocus
      onClose={() => router.back()}
      selectedDuration={pomodoroSetting.timing}
      selectedSoundscape={pomodoroSetting.sound}
      selectedCountdown={pomodoroSetting.isCountdown}
    />
  );
}
