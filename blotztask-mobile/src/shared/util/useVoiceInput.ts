import { useEffect, useRef, useState } from "react";
import Voice from "@react-native-community/voice";

type LangCode = "en" | "zh";

type UseVoiceInputOptions = {
  language?: LangCode;
  onFinalResult?: (text: string) => void;
};

const langMap: Record<LangCode, string> = {
  en: "en-US",
  zh: "zh-CN",
};

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { language = "en", onFinalResult } = options;
  const [partialText, setPartialText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<string[]>([]);

  useEffect(() => {
    Voice.onSpeechPartialResults = (e: any) => {
      const val = e.value?.[0] ?? "";
      setPartialText(val);
    };
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
    setPartialText("");
    setError(null);
    resultsRef.current = [];
    setInterimText("");
    try {
      await Voice.start(langMap[language]);
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
    setPartialText("");
    return finalText;
  };

  return {
    isListening,
    partialText,
    interimText,
    error,
    startListening,
    stopAndGetText,
  };
}
