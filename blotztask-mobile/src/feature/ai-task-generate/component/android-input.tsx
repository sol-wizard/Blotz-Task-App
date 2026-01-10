import { View, TextInput, Keyboard } from "react-native";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { AzureSpeechAPI } from "../services/azure-speech-android-apis";
import { useAzureSpeechToken } from "../hooks/useAzureSpeechToken";
import { AiLanguagePicker } from "./ai-language-picker";
import { SendButton } from "./send-button";
import { VoiceButton } from "./voice-button";

export const AndroidInput = ({
  text,
  setText,
  sendMessage,
  isAiGenerating,
  aiGeneratedMessage,
}: {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: AiResultMessageDTO;
}) => {
  const [isListening, setIsListening] = useState(false);
  const { tokenItem, isFetchingAzureToken } = useAzureSpeechToken();

  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved) => {
      if (saved === "en-US" || saved === "zh-CN") setLanguage(saved);
    });
    return "zh-CN";
  });

  const finalBufferRef = useRef<string>("");

  const mergeDisplayText = (partial: string) => {
    const final = finalBufferRef.current.trim();
    const partialText = (partial ?? "").trim();

    if (!final && !partialText) return "";
    if (final && !partialText) return final;
    if (!final && partialText) return partialText;
    return `${final} ${partialText}`.replace(/\s+/g, " ").trim();
  };

  useEffect(() => {
    const subPartial = AzureSpeechAPI.onPartial((value) => {
      const v = (value ?? "").trim();
      if (!v) return;

      console.log("Azure partial:", v);
      setText(mergeDisplayText(v));
    });

    const subFinal = AzureSpeechAPI.onFinal?.((value) => {
      const v = (value ?? "").trim();
      if (!v) return;

      console.log("Azure final:", v);
      finalBufferRef.current = mergeDisplayText(v);
      setText(finalBufferRef.current);
    });

    const subCanceled = AzureSpeechAPI.onCanceled((err) => {
      console.log("Azure error:", err);
      setIsListening(false);
    });

    return () => {
      subPartial.remove();
      subFinal?.remove?.();
      subCanceled.remove();
    };
  }, []);

  const handleSelectLanguage = async (lang: "en-US" | "zh-CN") => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem("ai_language_preference", lang);
    } catch (error) {
      console.error("Failed to save AI language preference:", error);
    }
  };

  const startListening = async () => {
    if (isFetchingAzureToken || !tokenItem) {
      console.log("Azure speech token not ready");
      return;
    }

    finalBufferRef.current = "";
    setText("");

    await AzureSpeechAPI.startListen({
      token: tokenItem.token,
      region: tokenItem.region,
      language,
    });

    console.log("Started listening with language:", language);
    setIsListening(true);
  };

  const stopListening = async () => {
    try {
      await AzureSpeechAPI.stopListen();
    } catch (err) {
      console.error("Error stopping Azure Speech listening:", err);
    }

    setIsListening(false);

    const final = finalBufferRef.current.trim();
    if (final) setText(final);
  };

  const abortListening = () => {
    AzureSpeechAPI.stopListen();
    setIsListening(false);
    finalBufferRef.current = "";
    setText("");
  };

  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    Keyboard.dismiss();
    setText("");
    finalBufferRef.current = "";
  };

  const onPressSend = () => {
    if (isListening) stopListening();
    const finalUserText = text.trim();
    if (!finalUserText) return;
    sendMessage(finalUserText);
    finalBufferRef.current = "";
  };

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
      return;
    }
    await startListening();
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onKeyPress={({ nativeEvent: { key } }) => {
              if (key === "Enter") {
                const cleaned = text.replace(/\n$/, "").trim();
                if (!cleaned) return;
                if (isListening) stopListening();
                sendWriteInput(cleaned);
              }
            }}
            enablesReturnKeyAutomatically
            autoFocus
            placeholder="Hold to speak or tap to write..."
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
            style={{ textAlignVertical: "top", textAlign: "left" }}
          />

          {aiGeneratedMessage?.errorMessage && (
            <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
          )}
        </View>

        <View className="flex-row items-center justify-between mb-6 w-96">
          <AiLanguagePicker value={language} onChange={handleSelectLanguage} />

          {text.trim() !== "" || isListening || isAiGenerating ? (
            <SendButton
              text={text}
              isRecognizing={isListening}
              isGenerating={isAiGenerating}
              abortListening={abortListening}
              sendMessage={() => onPressSend()}
              stopListening={stopListening}
            />
          ) : (
            <VoiceButton isRecognizing={isListening} toggleListening={toggleListening} />
          )}
        </View>
      </View>
    </View>
  );
};
