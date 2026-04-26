export function calculateTimerState(
  elapsedSeconds: number,
  targetDurationSeconds: number,
  isCountdown: boolean,
) {
  if (isCountdown) {
    const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);
    const isFinished = remainingSeconds === 0;
    return { displaySeconds: remainingSeconds, isFinished };
  } else {
    return { displaySeconds: elapsedSeconds, isFinished: false };
  }
}
