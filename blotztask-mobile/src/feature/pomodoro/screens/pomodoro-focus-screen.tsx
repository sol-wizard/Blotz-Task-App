import { router, useLocalSearchParams } from "expo-router";
import { PomodoroFocus } from "../components/pomodoro-focus";
import { usePomodoroSettingsQuery } from "../hooks/usePomodoroSetting";
import { queryClient } from "@/shared/util/queryClient";

export default function PomodoroFocusScreen() {
  const { data: pomodoroSetting } = usePomodoroSettingsQuery();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const activeSession = queryClient.getQueryData(["pomodoro", "activeSession"]) as {
    taskId: string;
    elapsedSeconds: number;
    isPaused: boolean;
    timestamp: number;
  };

  if (!pomodoroSetting) return null;

  let initialElapsed = 0;
  let initialPaused = false;

  if (activeSession && activeSession.taskId === taskId) {
    initialPaused = activeSession.isPaused;

    if (activeSession.isPaused) {
      initialElapsed = activeSession.elapsedSeconds;
    } else {
      const secondsPassedInBackground = Math.floor((Date.now() - activeSession.timestamp) / 1000);
      initialElapsed = activeSession.elapsedSeconds + secondsPassedInBackground;
    }
  }

  const handleMinimize = (elapsedSeconds: number, isPaused: boolean) => {
    queryClient.setQueryData(["pomodoro", "activeSession"], {
      taskId,
      elapsedSeconds,
      isPaused,
      timestamp: Date.now(),
    });
    router.back();
  };

  const handleEndSession = () => {
    queryClient.removeQueries({ queryKey: ["pomodoro", "activeSession"] });
    router.back();
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
    />
  );
}
