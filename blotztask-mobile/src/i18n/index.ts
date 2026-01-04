import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Import translation files
import enCalendar from "./locales/en/calendar.json";
import zhCalendar from "./locales/zh/calendar.json";

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
      calendar: enCalendar,
    },
    zh: {
      calendar: zhCalendar,
    },
  },
  lng: getDeviceLanguage(), // Will be overridden by user preference from backend
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  compatibilityJSON: "v4",
  react: {
    useSuspense: false, // Prevents suspense issues in React Native
  },
} as any);

export default i18n;

