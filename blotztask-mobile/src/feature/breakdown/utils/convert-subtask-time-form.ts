export function convertSubtaskTimeForm(timeStr: string): string {
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);

  if (minutes === 0 && seconds === 0) {
    return `${hours}h`;
  } else if (hours === 0 && seconds === 0) {
    return `${minutes}min`;
  } else if (hours > 0 && minutes > 0 && seconds === 0) {
    return `${minutes}min`;
  } else {
    return `${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "min" : ""}`;
  }
}

export function timeStrToHours(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const [h = 0, m = 0, s = 0] = String(timeStr).split(":").map((n) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  });
  return h + m / 60 + s / 3600;
}