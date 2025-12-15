import { formatInTimeZone } from "date-fns-tz";

export function convertToDateTimeOffset(date: Date): string {
  return formatInTimeZone(
    date,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    "yyyy-MM-dd'T'HH:mm:ssXXX",
  );
}
