export function getWeeklyDayFlag(dateOnly: string): number {
  const [year, month, dayOfMonth] = dateOnly.split("-").map(Number);
  const day = new Date(year, month - 1, dayOfMonth).getDay();
  const dayFlags = [64, 1, 2, 4, 8, 16, 32] as const;
  return dayFlags[day];
}
