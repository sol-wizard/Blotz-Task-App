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
      // 如果之前是暂停的，时间没有流逝，直接用缓存的秒数
      initialElapsed = activeSession.elapsedSeconds;
    } else {
      // 如果之前是运行状态，必须计算“离开页面到现在的真实时间差” (补偿后台时间)
      const secondsPassedInBackground = Math.floor((Date.now() - activeSession.timestamp) / 1000);
      initialElapsed = activeSession.elapsedSeconds + secondsPassedInBackground;
    }
  }

  const handleMinimize = (elapsedSeconds: number, isPaused: boolean) => {
    queryClient.setQueryData(["pomodoro", "activeSession"], {
      taskId,
      elapsedSeconds,
      isPaused,
      timestamp: Date.now(), // 记录存入的具体时间，供下次恢复时计算
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
