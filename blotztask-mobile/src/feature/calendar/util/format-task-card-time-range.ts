import { format, isSameDay, isToday, parseISO } from "date-fns";
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
    const timeRange =
      startTime === endTime
        ? format(start, TIME_FORMAT)
        : `${format(start, TIME_FORMAT)}-${format(end, TIME_FORMAT)}`;
    return `${timeRange} · ${formatDateLabel(start)}`;
  }

  // Across days: "19:00 · 05/15 - 20:00 · 05/16"
  return `${format(start, TIME_FORMAT)} · ${formatDateLabel(start)} - ${format(end, TIME_FORMAT)} · ${formatDateLabel(end)}`;
};
