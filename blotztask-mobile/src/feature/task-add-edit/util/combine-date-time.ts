export function combineDateTime(date: Date | null, time: Date | null): Date | null {
  if (!date) return null;
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }
  return merged;
}
