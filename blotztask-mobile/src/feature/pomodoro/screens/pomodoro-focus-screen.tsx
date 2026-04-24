import { router, useLocalSearchParams } from "expo-router";
import { PomodoroFocus } from "../components/pomodoro-focus";
import { usePomodoroSettingsQuery } from "../hooks/usePomodoroSetting";
import { pauseOtherSessions, useActiveSession } from "../hooks/useActiveSession";

export default function PomodoroFocusScreen() {
  const { data: pomodoroSetting } = usePomodoroSettingsQuery();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const { initialElapsed, initialPaused, saveSession, clearSession } = useActiveSession(
    taskId ?? "",
  );

  if (!pomodoroSetting) return null;

  const handleMinimize = (elapsedSeconds: number, isPaused: boolean) => {
    saveSession(elapsedSeconds, isPaused);
    router.back();
  };

  const handleEndSession = () => {
    clearSession();
    router.back();
  };

  const handleTogglePause = (currentIsPaused: boolean, currentElapsed: number) => {
    if (currentIsPaused && taskId) {
      pauseOtherSessions(taskId);
    }
  };

  return (
    <PomodoroFocus
      onMinimize={handleMinimize}
      onEnd={handleEndSession}
      selectedDuration={pomodoroSetting.timing}
      selectedSoundscape={pomodoroSetting.sound}
      selectedCountdown={pomodoroSetting.isCountdown}
      initialElapsedSeconds={initialElapsed}
      initialIsPaused={initialPaused}
      onTogglePauseInteract={handleTogglePause}
    />
  );
}
