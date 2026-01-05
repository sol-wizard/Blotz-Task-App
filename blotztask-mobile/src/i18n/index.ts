import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Import translation files
import enCommon from "./locales/en/common.json";
import zhCommon from "./locales/zh/common.json";
import enCalendar from "./locales/en/calendar.json";
import zhCalendar from "./locales/zh/calendar.json";
import enSettings from "./locales/en/settings.json";
import zhSettings from "./locales/zh/settings.json";
import enTasks from "./locales/en/tasks.json";
import zhTasks from "./locales/zh/tasks.json";
import enStarSpark from "./locales/en/star-spark.json";
import zhStarSpark from "./locales/zh/star-spark.json";

// Get device language code (e.g., 'en', 'zh')
const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const languageCode = locales[0].languageCode;
    // Map device language to supported languages
    if (languageCode?.startsWith("zh")) {
      return "zh";
    }
    return "en"; // Default to English for all other languages
  }
  return "en";
};

// Initialize i18n with device language as default
i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      calendar: enCalendar,
      settings: enSettings,
      tasks: enTasks,
      starSpark: enStarSpark,
    },
    zh: {
      common: zhCommon,
      calendar: zhCalendar,
      settings: zhSettings,
      tasks: zhTasks,
      starSpark: zhStarSpark,
    },
  },
  lng: getDeviceLanguage(), // Will be overridden by user preference from backend
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  compatibilityJSON: "v4",
  react: {
    useSuspense: false, // Prevents suspense issues in React Native
  },
} as any);

export default i18n;

