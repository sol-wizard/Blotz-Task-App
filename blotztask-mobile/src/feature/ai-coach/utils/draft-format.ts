import type { TFunction } from "i18next";
import { fromZonedTime } from "date-fns-tz";
import { DraftRecurrenceDto, DraftScheduleAssessmentDto, TaskDraftItemDto } from "../models/ai-coach-dto";

/** Warning for a calendar check that could not run: too many dates never passes on retry, a failed read may. */
export function scheduleUnverifiedText(assessment: Pick<DraftScheduleAssessmentDto, "reason"> | null | undefined,
  t: TFunction<"aiCoach">): string {
  return t(assessment?.reason === "too_many_dates" ? "draft.scheduleTooManyDates" : "draft.scheduleUnverified");
}

/** Matches the server's grace: a start within the last 5 minutes still counts as now. */
const PAST_START_GRACE_MS = 5 * 60 * 1000;

/** True when the item's start is more than the grace period before `now`. */
export const isPastStart = (item: Pick<TaskDraftItemDto, "date" | "startTime" | "timeZoneId">, now: number) =>
  !!item.date && !!item.startTime &&
  fromZonedTime(`${item.date}T${item.startTime}:00`, item.timeZoneId).getTime() < now - PAST_START_GRACE_MS;

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** "Today 09:00–11:00", "Tomorrow", "Mon, Oct 20 15:00–16:00"; null when the item has no date yet. */
export function formatDraftWhen(item: Pick<TaskDraftItemDto, "date" | "startTime" | "endTime">,
  t: TFunction<"aiCoach">, language: string, separator = " "): string | null {
  if (!item.date) return null;
  const today = new Date();
  const offset = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return dayKey(date);
  };
  const [year, month, day] = item.date.split("-").map(Number);
  const day0 = item.date === offset(0) ? t("chat.today")
    : item.date === offset(1) ? t("draft.tomorrow")
    : item.date === offset(-1) ? t("chat.yesterday")
    : new Date(year, month - 1, day).toLocaleDateString(language, {
      weekday: "short", month: "short", day: "numeric",
      ...(year !== today.getFullYear() ? { year: "numeric" } : {}),
    });
  if (!item.startTime) return day0;
  return `${day0}${separator}${item.startTime}–${item.endTime ?? "—"}`;
}

/** How many years ahead of this year the date wheels go. */
export const DRAFT_DATE_YEARS_AHEAD = 5;

/** The date wheels' range as yyyy-MM-dd: today (a coach task can't be saved with a past start) to 31 Dec, this year + 5. */
export function draftDateBounds(now = new Date()): { min: string; max: string } {
  return { min: dayKey(now), max: `${now.getFullYear() + DRAFT_DATE_YEARS_AHEAD}-12-31` };
}

/** yyyy-MM-dd strings compare correctly as text. */
export const clampDate = (date: string, min: string, max: string) => (date < min ? min : date > max ? max : date);

/** Latest start or end a same-day task can have on the 5-minute wheels. */
const LAST_TIME = 23 * 60 + 55;
const pad2 = (n: number) => String(n).padStart(2, "0");
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const toTime = (minutes: number) => {
  const clamped = Math.min(Math.max(minutes, 0), LAST_TIME);
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
};

/** Minutes from start to end, or null when either is missing or end is not after start. */
export function draftLength(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const length = toMinutes(end) - toMinutes(start);
  return length > 0 ? length : null;
}

/** Length given to a task that has no time yet. The coach's estimate can't help: the server derives it from the times. */
const DEFAULT_LENGTH = 60;
const floorToStep = (time: string) => toTime(Math.floor(toMinutes(time) / 5) * 5);

/**
 * The times the 5-minute wheels open on, so they show what ✓ saves: times off the grid move down to it, and a
 * missing start or end is filled for a 1-hour task. With neither, the task starts at the next full hour, or the
 * next 5-minute mark late in the evening, so it never starts in the past.
 */
export function fillDraftTimes(start: string | null, end: string | null, now = new Date()): { start: string; end: string } {
  if (start && end) return { start: floorToStep(start), end: floorToStep(end) };
  if (start) return { start: floorToStep(start), end: toTime(toMinutes(floorToStep(start)) + DEFAULT_LENGTH) };
  if (end) return { start: toTime(toMinutes(floorToStep(end)) - DEFAULT_LENGTH), end: floorToStep(end) };
  const current = now.getHours() * 60 + now.getMinutes();
  const nextHour = (now.getHours() + 1) * 60;
  const first = nextHour <= 23 * 60 ? nextHour : Math.min(Math.ceil((current + 1) / 5) * 5, LAST_TIME - 5);
  return { start: toTime(first), end: toTime(first + DEFAULT_LENGTH) };
}

/** The end after the start moved, keeping the task's length; unchanged when there is no valid length to keep. */
export function shiftEnd(previousStart: string | null, nextStart: string, end: string | null): string | null {
  const length = draftLength(previousStart, end);
  return length == null ? end : toTime(toMinutes(nextStart) + length);
}

/** "2h", "1h 30m", "45m" (中文: "2小时", "1小时30分钟", "45分钟"). */
export function formatDuration(minutes: number, t: TFunction<"aiCoach">): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return t("editModal.durationHoursMinutes", { hours, minutes: rest });
  if (hours) return t("editModal.durationHours", { hours });
  return t("editModal.durationMinutes", { minutes: rest });
}

export function formatRecurrence(recurrence: DraftRecurrenceDto, t: TFunction<"aiCoach">): string {
  const parts = [t(`editModal.frequency.${recurrence.frequency}`) +
    (recurrence.interval > 1 ? ` × ${recurrence.interval}` : "")];
  if (recurrence.frequency === "Weekly" && recurrence.daysOfWeek != null) {
    parts.push([1, 2, 4, 8, 16, 32, 64]
      .map((flag, index) => ((recurrence.daysOfWeek ?? 0) & flag ? t(`editModal.weekday.${index}`) : null))
      .filter(Boolean).join("、"));
  }
  if (recurrence.frequency === "Monthly" && recurrence.dayOfMonth != null) {
    parts.push(`${t("editModal.dayOfMonth")} ${recurrence.dayOfMonth}`);
  }
  if (recurrence.endDate) parts.push(`${t("editModal.endDate")}: ${recurrence.endDate}`);
  return parts.join(" · ");
}
