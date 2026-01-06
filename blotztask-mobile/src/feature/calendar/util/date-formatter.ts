import { isSameDay, format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
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

  if (isToday) {
    return {
      dayOfWeek: i18n.t("calendar:header.today"),
    };
  }

  const isChinese = i18n.language === "zh";

  if (isChinese) {
    // Chinese format: M月d日 (e.g., "1月9日")
    const month = dateObj.getMonth() + 1; // getMonth() returns 0-11
    const day = dateObj.getDate();
    return {
      dayOfWeek: `${month}月${day}日`,
    };
  }

  // English format: day month (e.g., "7 Jan")
  const locale = enUS;
  const month = format(dateObj, "MMM", { locale });
  const day = dateObj.getDate();

  return {
    dayOfWeek: `${day} ${month}`,
  };
};
