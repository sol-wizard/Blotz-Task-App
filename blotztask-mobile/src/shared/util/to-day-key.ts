import { format } from "date-fns";

/**
 * Returns the local day key in `yyyy-MM-dd` format from a local Date.
 * Always derive from a Date object in the user's local timezone.
 */
export function toDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
