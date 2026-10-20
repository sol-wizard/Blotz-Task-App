import type { TFunction } from "i18next";
import { DraftRecurrenceDto, TaskDraftItemDto } from "../models/ai-coach-dto";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** "Today 09:00–11:00", "Tomorrow", "Mon, Oct 20 15:00–16:00"; null when the item has no date yet. */
export function formatDraftWhen(item: Pick<TaskDraftItemDto, "date" | "startTime" | "endTime">,
  t: TFunction<"aiCoach">, language: string): string | null {
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
  return `${day0} ${item.startTime}–${item.endTime ?? "—"}`;
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
