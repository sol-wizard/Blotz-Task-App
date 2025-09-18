import { parseISO, isValid, isSameDay, format } from "date-fns";

type Range = { startTime?: string; endTime?: string };

const parseDate = (s?: string) => {
  if (!s) return null;
  const iso = parseISO(s);
  if (isValid(iso)) return iso;
  const d = new Date(s);
  return isValid(d) ? d : null;
};

export const formatSameDayTimeRange = ({ startTime, endTime }: Range): string => {
  const s = parseDate(startTime);
  const e = parseDate(endTime);

  if (!s && !e) return "";

  const fmt = (d: Date) => format(d, "h:mma").toLowerCase();

  if (s && !e) return fmt(s);
  if (!s && e) return fmt(e);
  if (!isSameDay(s!, e!)) return "Add Time";

  return `${fmt(s!)}-${fmt(e!)}`;
};
