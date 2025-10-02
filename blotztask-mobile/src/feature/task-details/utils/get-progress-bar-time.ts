export function parseHMStoParts(time?: string | null): [number, number, number] {
  if (!time) return [0, 0, 0];
  const parts = String(time)
    .split(":")
    .map((n) => Number(n) || 0);
  if (parts.length === 1) return [0, parts[0], 0]; // "MM"
  if (parts.length === 2) return [parts[0], parts[1], 0]; // "HH:MM"
  return [parts[0], parts[1], parts[2]]; // "HH:MM:SS"
}

export function secondsToHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
