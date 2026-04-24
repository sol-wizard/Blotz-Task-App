import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/util/queryClient";

export const pomodoroKeys = {
  all: ["pomodoro"] as const,
  activeSessions: () => [...pomodoroKeys.all, "activeSession"] as const,
  activeSession: (taskId: string) => [...pomodoroKeys.activeSessions(), taskId] as const,
};

interface ActiveSessionData {
  elapsedSeconds: number;
  isPaused: boolean;
  timestamp: number;
}

export function pauseOtherSessions(currentTaskId: string) {
  // 获取所有以 activeSession 开头的缓存
  const allSessions = queryClient.getQueriesData<ActiveSessionData | null>({
    queryKey: pomodoroKeys.activeSessions(),
  });

  const now = Date.now();

  allSessions.forEach(([queryKey, sessionData]) => {
    if (!sessionData) return;

    // 🌟 核心检查：确保从 queryKey 中正确提取了 taskId
    // 我们的 Key 结构是 ["pomodoro", "activeSession", taskId]
    const taskId = String(queryKey[queryKey.length - 1]);

    // 如果 ID 不匹配（是别人）且没暂停，才执行暂停
    if (taskId !== String(currentTaskId) && !sessionData.isPaused) {
      const secondsPassed = Math.floor((now - sessionData.timestamp) / 1000);

      queryClient.setQueryData(queryKey, {
        ...sessionData,
        elapsedSeconds: sessionData.elapsedSeconds + secondsPassed,
        isPaused: true, // 强制暂停别人
        timestamp: now,
      });
    }
  });
}

export function useActiveSession(taskId: string) {
  const queryKey = pomodoroKeys.activeSession(taskId);

  const { data: activeSession } = useQuery<ActiveSessionData | null>({
    queryKey,
    queryFn: () => queryClient.getQueryData<ActiveSessionData>(queryKey) ?? null,
    enabled: false,
    initialData: () => queryClient.getQueryData<ActiveSessionData>(queryKey) ?? null,
    staleTime: Infinity,
  });

  const hasActiveSession = !!activeSession;
  let initialElapsed = 0;
  let initialPaused = false;

  if (activeSession) {
    initialPaused = activeSession.isPaused;
    if (activeSession.isPaused) {
      initialElapsed = activeSession.elapsedSeconds;
    } else {
      const secondsPassed = Math.floor((Date.now() - activeSession.timestamp) / 1000);
      initialElapsed = activeSession.elapsedSeconds + secondsPassed;
    }
  }

  const saveSession = (elapsedSeconds: number, isPaused: boolean) => {
    queryClient.setQueryData(queryKey, {
      elapsedSeconds,
      isPaused,
      timestamp: Date.now(),
    });
  };

  const clearSession = () => {
    queryClient.setQueryData(queryKey, null);
  };

  return {
    initialElapsed,
    initialPaused,
    saveSession,
    clearSession,
    hasActiveSession,
  };
}
