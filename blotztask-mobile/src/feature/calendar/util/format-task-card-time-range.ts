import { format, isSameDay, isSameMinute, isToday, parseISO } from "date-fns";
import i18n from "@/i18n";

const TIME_FORMAT = "HH:mm";
const DATE_FORMAT = "MM/dd";

const formatDateLabel = (date: Date) =>
  isToday(date) ? i18n.t("calendar:header.today") : format(date, DATE_FORMAT);

export const formatTaskCardTimeRange = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  if (!startTime || !endTime) return "";

  const start = parseISO(startTime);
  const end = parseISO(endTime);

  // Same day: "19:00-21:00 · Today"
  if (isSameDay(start, end)) {
    const timeRange = isSameMinute(start, end)
      ? format(start, TIME_FORMAT)
      : `${format(start, TIME_FORMAT)}-${format(end, TIME_FORMAT)}`;
    return `${timeRange} · ${formatDateLabel(start)}`;
  }

  // Across days: "19:00 · 05/15 - 20:00 · 05/16".
  // Always explicit dates, never the "Today" label: the card appears on every day the
  // task spans, so "Today" would be read as the day being viewed rather than the day
  // the task actually starts or ends.
  return `${format(start, TIME_FORMAT)} · ${format(start, DATE_FORMAT)} - ${format(end, TIME_FORMAT)} · ${format(end, DATE_FORMAT)}`;
};
