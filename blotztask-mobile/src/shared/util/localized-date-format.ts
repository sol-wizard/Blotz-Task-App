import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import i18n from "@/i18n";

const DATE_FORMAT_PATTERNS = {
  abbrevMonthDayYear: {
    en: "MMM d, yyyy",
    zh: "yyyy年M月d日",
  },
  fullMonthDayYear: {
    en: "MMMM d, yyyy",
    zh: "yyyy年M月d日",
  },
  weekdayDayMonthYear: {
    en: "E, d MMM yyyy",
    zh: "yyyy年M月d日 EEE",
  },
  monthYear: {
    en: "MMMM yyyy",
    zh: "MMMM yyyy",
  },
  yearMonth: {
    en: "MMMM yyyy",
    zh: "yyyy年M月",
  },
};

type LocalizedDateFormatPreset = keyof typeof DATE_FORMAT_PATTERNS;

export const formatLocalizedDate = (date: Date, dateFormat: LocalizedDateFormatPreset) => {
  const userLanguage = i18n.language.toLowerCase().startsWith("zh") ? "zh" : "en";

  return format(date, DATE_FORMAT_PATTERNS[dateFormat][userLanguage], {
    locale: userLanguage === "zh" ? zhCN : enUS,
  });
};
