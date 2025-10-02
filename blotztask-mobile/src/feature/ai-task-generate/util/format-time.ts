import { format, parseISO } from "date-fns";

/**
 * Format an ISO string to a time string
 * @param iso - ISO date string
 * @param fmt - Format string (default: "HH:mm")
 * @returns Formatted time string or empty string if invalid
 */
export function formatTime(iso?: string, fmt: string = "HH:mm"): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return "";
  }
}

/**
 * Format a time range from start and end ISO strings
 * @param start - Start time ISO string
 * @param end - End time ISO string
 * @returns Formatted time range string (e.g., "09:00 - 10:00")
 */
export function formatTimeRange(start?: string, end?: string): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s || e || "";
}
