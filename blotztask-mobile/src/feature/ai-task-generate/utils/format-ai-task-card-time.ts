import { format, isSameDay, parseISO } from "date-fns";
import i18n from "@/i18n";

const formatCardDateForLocale = (isoString: string) => {
  const date = parseISO(isoString);
  const isChinese = i18n.language === "zh";

  if (isChinese) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }

  // English format: 08 Jan
};

export const formatAiTaskCardDate = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  const isChinese = i18n.language === "zh";

  if (!startTime && !endTime) {
    // Reuse existing "today" translation for Chinese calendar
    return isChinese ? i18n.t("calendar:header.today") : "Today";
  }

  if (startTime && endTime) {
    const startDate = parseISO(startTime);
    const endDate = parseISO(endTime);

    if (isSameDay(startDate, endDate)) {
      return formatCardDateForLocale(startTime);
    }

    return `${formatCardDateForLocale(startTime)} - ${formatCardDateForLocale(endTime)}`;
  }
};

export const formatAiTaskCardTime = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  if (!startTime && !endTime) {
    return "";
  } else if (startTime && endTime && startTime === endTime) {
    return `${format(parseISO(startTime), "H:mm")}`;
  } else if (startTime && endTime && startTime !== endTime) {
    return `${format(parseISO(startTime), "H:mm")} - ${format(parseISO(endTime), "H:mm")}`;
  }
};
