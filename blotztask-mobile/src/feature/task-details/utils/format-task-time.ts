import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import i18n from "@/i18n";

export function formatTaskTime(utcString: string): string {
  const date = parseISO(utcString);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${utcString}`);
  }

  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const timeFormat = "HH:mm";

  if (isToday(date)) {
    const todayText = i18n.t("calendar:header.today");
    return `${todayText} ${format(date, timeFormat)}`;
  }

  if (isTomorrow(date)) {
    const tomorrowText = i18n.t("calendar:header.tomorrow");
    return `${tomorrowText} ${format(date, timeFormat)}`;
  }

  // Format date based on locale
  const dateFormat = isChinese ? "M月d日 HH:mm" : "MMM d HH:mm";
  return format(date, dateFormat, { locale });
}
