import { isSameDay } from "date-fns";
import i18n from "@/i18n";

/**
 * Formats a date string for calendar display
 * @param dateString - Date string in format YYYY-MM-DD
 * @returns Object containing the day of week display string
 */
export const formatCalendarDate = (dateString: string) => {
  const dateObj = new Date(`${dateString}T00:00:00`);
  const today = new Date();

  const isToday = isSameDay(dateObj, today);

  const month = dateObj.toLocaleString("default", { month: "short" });
  const day = dateObj.getDate();

  return {
    dayOfWeek: isToday ? i18n.t("calendar:header.today") : `${day} ${month}`,
  };
};
