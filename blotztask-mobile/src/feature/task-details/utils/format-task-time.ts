import { format, isToday, isTomorrow, parseISO } from "date-fns";

export function formatTaskTime(utcString: string): string {
  const date = parseISO(utcString);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${utcString}`);
  }

  if (isToday(date)) {
    return `Today ${format(date, "HH:mm")}`;
  }

  if (isTomorrow(date)) {
    return `Tomorrow ${format(date, "HH:mm")}`;
  }

  return format(date, "MMM d HH:mm");
}
