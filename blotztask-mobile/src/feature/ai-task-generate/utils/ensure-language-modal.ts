import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export const ensureLanguageModal = async () => {
  let cancelled = false;
  try {
    const supportedLocales = await ExpoSpeechRecognitionModule.getSupportedLocales({
      androidRecognitionServicePackage: "com.google.android.as",
    });

    console.log("Supported locales:", supportedLocales.locales.join(", "));
    console.log("On-device locales:", supportedLocales.installedLocales.join(", "));

    const targetLocales = ["en-US", "cmn-Hans-CN"];

    const missingLocales = targetLocales.filter(
      (locale) => !supportedLocales.installedLocales.includes(locale),
    );

    if (missingLocales.length === 0) {
      console.log("All target offline models already installed:", targetLocales.join(", "));
      return;
    }

    console.log("Missing offline models, will download:", missingLocales.join(", "));

    for (const locale of missingLocales) {
      if (cancelled) {
        console.log("Download cancelled, stop processing further locales.");
        return;
      }

      console.log(`Initiating offline model download for ${locale}...`);

      const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
        locale,
      });

      if (cancelled) {
        console.log("Cancelled after download call, exiting.");
        return;
      }

      console.log(`Offline model download result for ${locale}:`, result);

      if (result.status === "download_canceled") {
        console.log(`User canceled offline model download for ${locale}.`);
        // 如果用户取消其中一个，可以选择继续/停止
        // 这里我选择继续尝试下一个 locale，如需停止可以直接 return
      }
    }
  } catch (error) {
    if (!cancelled) {
      console.error("Failed to ensure offline speech models:", error);
    }
  }
};
