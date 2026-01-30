import { Language } from "@/shared/models/user-preferences-dto";
import * as Localization from "expo-localization";

export const systemPreferredLanguage: Language = (() => {
  const primary = Localization.getLocales()[0];
  return primary?.languageTag?.toLowerCase().startsWith("zh") ? Language.Zh : Language.En;
})();
