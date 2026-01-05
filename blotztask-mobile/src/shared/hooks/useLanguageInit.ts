import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { Language } from "@/shared/models/user-preferences-dto";

/**
 * Hook to initialize app language based on user preferences from backend
 * Converts backend enum (Language.En | Language.Zh) to i18n language code ("en" | "zh")
 */
export function useLanguageInit() {
  const { i18n } = useTranslation();
  const { userPreferences } = useUserPreferencesQuery();

  useEffect(() => {
    if (userPreferences?.preferredLanguage) {
      // Convert backend enum to i18n language code
      const language = userPreferences.preferredLanguage === Language.En ? "en" : "zh";
      
      // Only change if different from current
      if (i18n.language !== language) {
        i18n.changeLanguage(language);
        console.log(`Language initialized from backend: ${language}`);
      }
    }
  }, [userPreferences?.preferredLanguage, i18n]);
}

