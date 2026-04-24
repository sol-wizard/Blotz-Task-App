import { useState, useEffect } from "react";
import { calculateTimerState } from "../utils/elapsed-timer";
import { formatDuration } from "../utils/format-duration";

export function usePomodoroTimer(
  targetDurationMinutes: number,
  isCountdown: boolean = true,
  initialElapsedSeconds: number = 0,
  initialIsPaused: boolean = false,
) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [isPaused, setIsPaused] = useState(initialIsPaused);
  const targetDurationSeconds = targetDurationMinutes * 60;

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const { displaySeconds, isFinished } = calculateTimerState(
    elapsedSeconds,
    targetDurationSeconds,
    isCountdown,
  );

  useEffect(() => {
    if (isFinished && !isPaused) {
      setIsPaused(true);
      // Could add sound here or other side effects on timer finish
    }
  }, [isFinished, isPaused]);

  return {
    displayTimeStr: formatDuration(displaySeconds),
    elapsedSeconds,
    isFinished,
    isPaused,
    togglePause: () => setIsPaused(!isPaused),
    endTimer: () => setIsPaused(true),
  };
}
