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
  // 拿到所有 activeSession 前缀的缓存
  const allSessions = queryClient.getQueriesData<ActiveSessionData | null>({
    queryKey: pomodoroKeys.activeSessions(),
  });

  const now = Date.now();

  allSessions.forEach(([queryKey, sessionData]) => {
    if (!sessionData) return;

    // 提取出对应的 taskId
    const taskId = queryKey[queryKey.length - 1] as string;

    // 如果是别人的任务，并且还在运行中，强制结算并暂停！
    if (taskId !== currentTaskId && !sessionData.isPaused) {
      const secondsPassed = Math.floor((now - sessionData.timestamp) / 1000);

      queryClient.setQueryData(queryKey, {
        ...sessionData,
        elapsedSeconds: sessionData.elapsedSeconds + secondsPassed,
        isPaused: true, // 强制暂停
        timestamp: now,
      });
    }
  });
}

export function useActiveSession(taskId: string) {
  const queryKey = pomodoroKeys.activeSession(taskId);

  const { data: activeSession } = useQuery<ActiveSessionData>({
    queryKey,
    queryFn: () => null as any,
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
    queryClient.removeQueries({ queryKey });
  };

  return {
    initialElapsed,
    initialPaused,
    saveSession,
    clearSession,
    hasActiveSession,
  };
}
