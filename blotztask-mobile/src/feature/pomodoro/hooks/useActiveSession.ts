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

export function useActiveSession(taskId: string) {
  const queryKey = pomodoroKeys.activeSession(taskId);

  const { data: activeSession } = useQuery<ActiveSessionData>({
    queryKey,
    queryFn: () => null as any,
    staleTime: Infinity,
  });

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
  };
}
