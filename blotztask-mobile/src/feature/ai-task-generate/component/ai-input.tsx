import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";
import { Pressable, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

export const AiInput = ({
  text,
  setText,

  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  isAiGenerating,
  aiGeneratedMessage,
}: {
  text: string;
  setText: (v: string) => void;

  sendMessage: (v: string) => void;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: AiResultMessageDTO;
}) => {
  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved);
      }
    });
    return "zh-CN";
  });

  return (
    <View>
      <View className="flex-row mb-8 ml-4 items-center">
        <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} setText={setText} />
        <Pressable
          onPress={() => {
            const newLang = language === "en-US" ? "zh-CN" : "en-US";
            setLanguage(newLang);
            AsyncStorage.setItem("ai_language_preference", newLang);
          }}
          className="w-8 h-8 bg-black rounded-full items-center justify-center ml-8"
        >
          <Text className="text-white font-bold text-base">
            {language === "en-US" ? "EN" : "中"}
          </Text>
        </Pressable>
      </View>

      {isVoiceInput ? (
        <VoiceInput
          setText={setText}
          sendMessage={sendMessage}
          errorMessage={aiGeneratedMessage?.errorMessage}
          language={language}
          isAiGenerating={isAiGenerating}
        />
      ) : (
        <WriteInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          errorMessage={aiGeneratedMessage?.errorMessage}
          isAiGenerating={isAiGenerating}
        />
      )}
    </View>
  );
};
