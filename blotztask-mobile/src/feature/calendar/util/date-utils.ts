export function getStartOfDayUtc(date: Date): Date {
  // Construct local midnight, then serialize to UTC with toISOString when sending
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
