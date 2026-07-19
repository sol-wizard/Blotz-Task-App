import { format, parseISO } from "date-fns";

export function formatTaskEndTime(endTime: string): string {
  if (!endTime) {
    return "";
  }

  return format(parseISO(endTime), "H:mm");
}
