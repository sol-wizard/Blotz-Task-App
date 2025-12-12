import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useState } from "react";
import { Platform } from "react-native";

export function useSpeechRecognition({ language = "en-US" }: { language?: string } = {}) {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    console.log("Speech recognition started");
  });

  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript);
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.log("error code:", event.error, "error message:", event.message);
  });

  const handleStartListening = async () => {
    console.log("Starting speech recognition");

    try {
      const supportedLocales = await ExpoSpeechRecognitionModule.getSupportedLocales({
        androidRecognitionServicePackage: "com.google.android.as",
      });

      console.log("Supported locales:", supportedLocales.locales.join(", "));
      console.log("On-device locales:", supportedLocales.installedLocales.join(", "));

      const hasOnDevicePackage = supportedLocales.installedLocales.length > 0;

      if (Platform.OS === "android" && !hasOnDevicePackage) {
        console.log("No on-device package found, initiating download...");

        const result = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
          locale: language,
        });

        console.log("Offline model download result:", result);
        if (result.status === "download_canceled") {
          console.log("User canceled offline model download, aborting start.");
          return;
        }
      }

      const perm = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      console.log("getPermissionsAsync:", perm);

      if (!perm.granted) {
        console.warn("Speech recognition permission not granted:", perm);

        return;
      }

      console.log("Calling ExpoSpeechRecognitionModule.start");
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      console.error("handleStartListening error:", error);
    }
  };

  return {
    handleStartListening,
    recognizing,
    transcript,
    stopListening: () => ExpoSpeechRecognitionModule.stop(),
  };
}
