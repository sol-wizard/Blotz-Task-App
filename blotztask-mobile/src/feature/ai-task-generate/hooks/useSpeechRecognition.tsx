import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useState } from "react";

export function useSpeechRecognition({ language = "en-US" }: { language?: string } = {}) {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
  });

  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript);
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.log("error code:", event.error, "error message:", event.message);
  });

  const handleStartListening = async () => {
    const perm = await ExpoSpeechRecognitionModule.getPermissionsAsync();

    if (!perm.granted) {
      console.warn("Speech recognition permission not granted:", perm);
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: language,
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        EXTRA_ENABLE_LANGUAGE_SWITCH: "balanced",
      },
    });
  };

  return {
    handleStartListening,
    recognizing,
    transcript,
    stopListening: () => ExpoSpeechRecognitionModule.stop(),
    abortListening: () => ExpoSpeechRecognitionModule.abort(),
  };
}
