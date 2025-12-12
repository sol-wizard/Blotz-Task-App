import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { Platform } from "react-native";

export const ensureLanguageModel = async (locales: string | string[]) => {
  if (Platform.OS !== "android") return true;

  const targetLocales = Array.isArray(locales) ? locales : [locales];

  try {
    const supportedLocales = await ExpoSpeechRecognitionModule.getSupportedLocales({
      androidRecognitionServicePackage: "com.google.android.as",
    });
    console.log("get supportedLocales");

    const missingLocales = targetLocales.filter(
      (locale) => !supportedLocales.installedLocales.includes(locale),
    );

    if (missingLocales.length === 0) {
      console.log("All target offline models already installed:", targetLocales.join(", "));
      return true;
    }

    for (const locale of missingLocales) {
      console.log(`Initiating offline model download for ${locale}...`);

      const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
        locale,
      });

      console.log(`Offline model download result for ${locale}:`, result);

      if (result.status === "download_canceled") {
        console.log(`User canceled offline model download for ${locale}.`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to ensure offline speech models:", error);
    return false;
  }
};
