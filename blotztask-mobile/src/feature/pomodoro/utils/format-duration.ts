export function formatDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return "00:00";

  const totalSeconds = duration * 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
