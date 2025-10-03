import { isSameDay } from "date-fns";

/**
 * Formats a date string for calendar display
 * @param dateString - Date string in format YYYY-MM-DD
 * @returns Object containing formatted date parts (dayOfWeek, monthDay, year)
 */
export const formatCalendarDate = (dateString: string) => {
  const dateObj = new Date(`${dateString}T00:00:00`);
  const today = new Date();

  const isToday = isSameDay(dateObj, today);

  const month = dateObj.toLocaleString("default", { month: "short" });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  return {
    dayOfWeek: isToday ? "Today" : `${day} ${month}`,
    monthDay: `${month} ${day}`,
    year: year.toString(),
  };
};
