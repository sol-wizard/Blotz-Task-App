import { useEffect, useRef, useState } from "react";
import Voice from "@react-native-voice/voice";

type UseVoiceInputOptions = {
  language?: string;
  onFinalResult?: (text: string) => void;
};

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { language = "en-US", onFinalResult } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<string[]>([]);

  useEffect(() => {
    Voice.onSpeechResults = (e: any) => {
      const values: string[] = e?.value ?? [];
      resultsRef.current = values;
      setInterimText(values.join(" "));
    };

    Voice.onSpeechError = (e: any) => {
      const msg = e?.error?.message ?? "Speech error";
      setError(msg);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, []);

  const startListening = async () => {
    setError(null);
    resultsRef.current = [];
    setInterimText("");
    try {
      await Voice.start(language);
      setIsListening(true);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setIsListening(false);
    }
  };

  const stopAndGetText = async (): Promise<string> => {
    try {
      await Voice.stop();
    } catch {
      console.log("Error stopping voice recognition");
    }
    const finalText = (resultsRef.current ?? []).join(" ").trim();
    if (finalText && onFinalResult) onFinalResult(finalText);
    setIsListening(false);
    return finalText;
  };

  return {
    isListening,
    interimText,
    error,
    startListening,
    stopAndGetText,
  };
}
