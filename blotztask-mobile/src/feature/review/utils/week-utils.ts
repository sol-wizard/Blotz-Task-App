import { addDays, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";

// Weekly periods run Monday–Sunday (see review-tasks.md product decisions).
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export function startOfReviewWeek(date: Date): Date {
  return startOfWeek(date, WEEK_OPTIONS);
}

// The latest finished week and month: what the Review tab shows first, and what its red dot tracks.
export function getLatestReviewableWeek(now: Date = new Date()): Date {
  return startOfReviewWeek(subWeeks(now, 1));
}

export function getLatestReviewableMonth(now: Date = new Date()): Date {
  return startOfMonth(subMonths(now, 1));
}

// Labels use an explicit range, e.g. "Jun 3 - Jun 9" / "6月3日 - 6月9日".
export function formatWeek(weekStart: Date, lang: string): string {
  const isZh = lang.toLowerCase().startsWith("zh");
  const weekEnd = addDays(weekStart, 6);
  const locale = isZh ? zhCN : enUS;
  const dayFormat = isZh ? "M月d日" : "MMM d";

  const start = format(weekStart, dayFormat, { locale });
  const end = format(weekEnd, dayFormat, { locale });
  return `${start} - ${end}`;
}
