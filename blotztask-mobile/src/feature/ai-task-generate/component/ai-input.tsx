import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";
import { Pressable, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";

export const AiInput = ({
  text,
  setText,
  sheetRef,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  generateTaskError,
  setInputError,
  errorMessage,
  isAiGenerating,
}: {
  text: string;
  setText: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  sendMessage: (v: string) => void;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
  generateTaskError: boolean;
  setInputError: (v: boolean) => void;
  errorMessage?: string;
  isAiGenerating: boolean;
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
    <View className="w-96">
      <View className="flex-row mb-8 -ml-6 items-center">
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
          hasError={generateTaskError}
          setInputError={setInputError}
          errorMessage={errorMessage}
          language={language}
          isAiGenerating={isAiGenerating}
        />
      ) : (
        <WriteInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          hasError={generateTaskError}
          sheetRef={sheetRef}
          errorMessage={errorMessage}
          isAiGenerating={isAiGenerating}
        />
      )}
    </View>
  );
};
