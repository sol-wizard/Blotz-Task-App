import { View, TextInput, Keyboard } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { AzureSpeechAPI } from "../services/azure-speech-android-apis";
import { useAzureSpeechToken } from "../hooks/useAzureSpeechToken";
import { AiLanguagePicker } from "./ai-language-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    AsyncStorage.getItem("ai_language_preference").then((saved: string | null) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved as "en-US" | "zh-CN");
      }
    });
    return "zh-CN";
  });
  const subscriptions = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    subscriptions.current = [
      AzureSpeechAPI.onPartial((value) => {
        console.log("Azure partial:", value);
        if (value) setText(value);
      }),
      AzureSpeechAPI.onFinal((value) => {
        console.log("Azure final:", value);
        if (value) setText(value);
      }),
      AzureSpeechAPI.onCanceled((err) => console.log("Azure error:", err)),
    ];

    return () => {
      subscriptions.current.forEach((sub) => sub.remove());
      subscriptions.current = [];
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

  const toggleListening = async () => {
    if (isListening) {
      AzureSpeechAPI.stopListen();
      setIsListening(false);
      return;
    }

    if (isFetchingAzureToken || !tokenItem) {
      console.log("Azure speech token not ready");
      return;
    }

    AzureSpeechAPI.startListen({
      token: tokenItem.token,
      region: tokenItem.region,
      language,
    });
    setIsListening(true);
  };

  const stopListening = () => {
    AzureSpeechAPI.stopListen();
    setIsListening(false);
  };

  const abortListening = () => {
    AzureSpeechAPI.stopListen();
    setIsListening(false);
    setText("");
  };

  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          <TextInput
            value={text}
            onChangeText={(v: string) => setText(v)}
            onKeyPress={({ nativeEvent: { key } }) => {
              if (key === "Enter") {
                const cleaned = text.replace(/\n$/, "").trim();
                if (!cleaned) return;
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
          {text.trim() !== "" || isListening ? (
            <SendButton
              text={text}
              isRecognizing={isListening}
              isGenerating={isAiGenerating}
              abortListening={abortListening}
              sendMessage={sendMessage}
              stopListening={stopListening}
            />
          ) : (
            <VoiceButton isRecognizing={isListening} toggleListening={toggleListening} />
          )}
        </View>

        {isAiGenerating && (
          <View className="flex-row items-center mt-4 mb-8 w-full px-2 justify-center">
            <CustomSpinner size={60} style={{ marginRight: 10 }} />
          </View>
        )}
      </View>
    </View>
  );
};
