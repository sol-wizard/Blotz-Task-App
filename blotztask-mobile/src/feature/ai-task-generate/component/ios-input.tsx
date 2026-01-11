import { View, Vibration, TextInput } from "react-native";
import { useEffect, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import * as Haptics from "expo-haptics";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { VoiceButton } from "./voice-button";
import { SendButton } from "./send-button";
import { requestIOSMicrophonePermission } from "../utils/request-microphone-permission";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { installAndroidLanguagePackage } from "../utils/install-android-language-package";
import { AiLanguagePicker } from "./ai-language-picker";
import { Platform } from "react-native";

export const IOSInput = ({
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
  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved: string | null) => {
      if (saved === "en-US" || saved === "zh-CN") {
        setLanguage(saved as "en-US" | "zh-CN");
      }
    });
    return "zh-CN";
  });

  useEffect(() => {
    if (Platform.OS === "android") {
      return;
    }

    requestIOSMicrophonePermission();
    installAndroidLanguagePackage(["en-US", "cmn-Hans-CN"]);
  }, []);
  const handleSelectLanguage = async (lang: "en-US" | "zh-CN") => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem("ai_language_preference", lang);
    } catch (error) {
      console.error("Failed to save AI language preference:", error);
    }
  };
  const { handleStartListening, recognizing, transcript, stopListening, abortListening } =
    useSpeechRecognition({
      language,
    });

  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  const toggleListening = async () => {
    if (recognizing) {
      stopListening();
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Vibration.vibrate(10);
    }

    await handleStartListening();
  };

  const handleAbortListening = () => {
    abortListening();
    setText("");
  };

  const showSendButton = text.trim() !== "" || recognizing;
  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          <TextInput
            value={text}
            onChangeText={(v: string) => setText(v)}
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
          {Platform.OS !== "android" && (
            <AiLanguagePicker value={language} onChange={handleSelectLanguage} />
          )}
          {showSendButton ? (
            <SendButton
              text={text}
              isRecognizing={recognizing}
              isGenerating={isAiGenerating}
              abortListening={handleAbortListening}
              sendMessage={sendMessage}
              stopListening={stopListening}
            />
          ) : (
            <VoiceButton isRecognizing={recognizing} toggleListening={toggleListening} />
          )}
        </View>
      </View>
    </View>
  );
};
