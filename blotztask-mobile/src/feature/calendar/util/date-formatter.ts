import { isSameDay } from "date-fns";

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
