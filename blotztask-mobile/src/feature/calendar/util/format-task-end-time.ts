import { format, parseISO } from "date-fns";

export function formatTaskEndTime(endTime: string): string {
  const parsedEndTime = parseISO(endTime);
  return Number.isNaN(parsedEndTime.getTime()) ? "" : format(parsedEndTime, "H:mm");
}
